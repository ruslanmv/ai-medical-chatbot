import OpenAI from 'openai';
import type { ChatMessage, ProviderResponse } from './index';
import { loadConfig } from '@/lib/server-config';

// NOTE: the medical system prompt is built once in app/api/chat/route.ts via
// buildMedicalSystemPrompt() and passed in as messages[0]. We deliberately
// do NOT prepend a second, shorter prompt here — stacking two system roles
// caused the model to see contradictory guidance (the route's structured
// OUTPUT_CONTRACT vs. the simpler bullet list this provider used to inject),
// and on small ollama models it triggered the OUTPUT_CONTRACT to be
// dropped entirely. The provider is now content-neutral.

function getClient(): OpenAI {
  // Prefer admin-configured values (from /api/admin/config PUT) so updates
  // in the Admin UI take effect without a redeploy. Fall back to env vars.
  let configUrl = '';
  let configKey = '';
  try {
    const cfg = loadConfig();
    configUrl = cfg.llm.ollabridgeUrl;
    configKey = cfg.llm.ollabridgeApiKey;
  } catch {
    // If the config file can't be read (e.g. cold start before /data mount),
    // silently fall through to env vars.
  }

  const baseURL =
    configUrl ||
    process.env.OLLABRIDGE_URL ||
    'https://ruslanmv-ollabridge.hf.space';
  const apiKey = configKey || process.env.OLLABRIDGE_API_KEY || 'not-required';

  // Timeout: 12s.
  //
  // OllaBridge is now the SECONDARY provider (Groq is primary). When a
  // request reaches OllaBridge, Groq has already failed or is unconfigured,
  // and we still have to leave headroom for HuggingFace as the tertiary
  // fallback inside the same edge-function budget (~50s on Vercel /
  // ~60s on HF Spaces). 12s comfortably covers the OllaBridge cloud
  // rungs (~0.5-3s each) and a fast local-ollama path, but cuts off
  // pathological 30s+ local generations that used to burn the entire
  // budget and starve the HF fallback.
  return new OpenAI({
    baseURL: `${baseURL.replace(/\/+$/, '')}/v1`,
    apiKey,
    timeout: 12000,
    maxRetries: 0,
  });
}

/** True when admin hasn't configured an OllaBridge URL — we skip the try. */
export function isOllaBridgeConfigured(): boolean {
  try {
    const cfg = loadConfig();
    if (cfg.llm.ollabridgeUrl) return true;
  } catch {
    // ignore
  }
  return !!process.env.OLLABRIDGE_URL;
}

export async function streamWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ReadableStream> {
  const client = getClient();
  console.log(
    `[Chat] provider.ollabridge.dispatch ${JSON.stringify({
      baseURL: client.baseURL,
      model,
      turns: messages.length,
    })}`,
  );

  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    // 512 tokens: enough room for the structured OUTPUT_CONTRACT response
    // (Assessment / Red flags / Possible causes / What to do now / When
    // to seek care / Sources). 256 was truncating mid-section on the
    // primary path. Inside the 12s provider timeout this stays well
    // within budget on cloud OllaBridge rungs (~150-400 tok/s).
    max_tokens: 512,
    temperature: 0.4,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            const data = JSON.stringify({
              choices: [{ delta: { content } }],
              provider: 'ollabridge',
              model: chunk.model || model,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function chatWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    // 512 tokens: enough for the structured OUTPUT_CONTRACT response
    // without overrunning the 12s provider timeout on cloud rungs.
    max_tokens: 512,
    temperature: 0.4,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'ollabridge',
    model: response.model || model,
  };
}

import type { ChatMessage, ProviderResponse } from './index';
import { loadConfig } from '@/lib/server-config';

/**
 * HuggingFace Inference Providers router — OpenAI-compatible endpoint.
 *
 * Uses router.huggingface.co with a deep fallback chain of verified
 * working models (tested 2026-04-07). Provider pinning via :suffix
 * syntax routes to specific backends (sambanova, together, etc.).
 *
 * Token resolution: admin-configured token (via Admin → Server → HuggingFace)
 * takes precedence over the HF_TOKEN env var, so admins can fix bad tokens
 * without redeploying the Space.
 */
const HF_BASE_URL = 'https://router.huggingface.co/v1';

function getHfToken(): string {
  try {
    const cfg = loadConfig();
    if (cfg.llm.hfToken) return cfg.llm.hfToken;
  } catch {
    // config file unreadable; fall through to env
  }
  return process.env.HF_TOKEN || '';
}

function getAdminDefaultModel(): string {
  try {
    const cfg = loadConfig();
    if (cfg.llm.hfDefaultModel) return cfg.llm.hfDefaultModel;
  } catch {
    // ignore
  }
  return '';
}

/** Ordered fallback chain — all verified working on free tier. */
const BASE_MODEL_CHAIN = [
  'meta-llama/Llama-3.3-70B-Instruct:sambanova',
  'meta-llama/Llama-3.3-70B-Instruct:together',
  'meta-llama/Llama-3.3-70B-Instruct',       // auto-route
  'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen3-235B-A22B',
  'google/gemma-3-27b-it',
  'meta-llama/Llama-3.1-70B-Instruct',
  'Qwen/Qwen3-32B',
  'deepseek-ai/DeepSeek-V3-0324',
];

/**
 * Resolve the model chain at request time so admin-configured default
 * models take effect without a redeploy. The admin value is inserted at
 * the TOP of the chain (duplicates removed) so it's tried first.
 */
function getModelChain(): string[] {
  const adminDefault = getAdminDefaultModel();
  if (!adminDefault) return BASE_MODEL_CHAIN;
  return [adminDefault, ...BASE_MODEL_CHAIN.filter((m) => m !== adminDefault)];
}

async function callHF(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
): Promise<Response> {
  const token = getHfToken();
  return fetch(`${HF_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
      stream,
    }),
  });
}

export async function streamWithHuggingFace(
  messages: ChatMessage[],
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const token = getHfToken();
  if (!token) {
    console.error('[Chat] provider.huggingface.no-token — admin must set HF token');
    throw new Error(
      'HF token not configured — set it in Admin → Server → HuggingFace',
    );
  }

  // Try each model in the chain until one succeeds. Every attempt is
  // logged with latency + status so a developer can reconstruct the
  // cascade from the HF Space run logs. The chain starts with the
  // admin-configured default model (if any), so UI changes take effect
  // without a redeploy.
  const chain = getModelChain();
  let response: Response | null = null;
  let activeModel = chain[0];
  for (const model of chain) {
    const start = Date.now();
    const res = await callHF(messages, model, true);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      console.log(
        `[Chat] provider.huggingface.attempt ${JSON.stringify({
          model,
          status: res.status,
          latencyMs,
          result: 'ok',
        })}`,
      );
      response = res;
      activeModel = model;
      break;
    }
    console.warn(
      `[Chat] provider.huggingface.attempt ${JSON.stringify({
        model,
        status: res.status,
        latencyMs,
        result: 'fallback',
      })}`,
    );
  }
  if (!response || !response.ok) {
    throw new Error('All HF Inference models unavailable');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  return new ReadableStream({
    async start(controller) {
      try {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const data = JSON.stringify({
                    choices: [{ delta: { content } }],
                    provider: 'huggingface',
                    model: activeModel,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
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

export async function chatWithHuggingFace(
  messages: ChatMessage[],
): Promise<ProviderResponse> {
  if (!getHfToken()) {
    console.error('[Chat] provider.huggingface.no-token.nonstream');
    throw new Error('HF token not configured');
  }
  const chain = getModelChain();
  let response: Response | null = null;
  let activeModel = chain[0];
  for (const model of chain) {
    const start = Date.now();
    const res = await callHF(messages, model, false);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      console.log(
        `[Chat] provider.huggingface.attempt.nonstream ${JSON.stringify({
          model,
          status: res.status,
          latencyMs,
          result: 'ok',
        })}`,
      );
      response = res;
      activeModel = model;
      break;
    }
    console.warn(
      `[Chat] provider.huggingface.attempt.nonstream ${JSON.stringify({
        model,
        status: res.status,
        latencyMs,
        result: 'fallback',
      })}`,
    );
  }
  if (!response || !response.ok) {
    throw new Error('All HF Inference models unavailable');
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'huggingface',
    model: activeModel,
  };
}

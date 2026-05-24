import OpenAI from 'openai';
import type { ChatMessage, ProviderResponse } from './index';
import { loadConfig } from '@/lib/server-config';

/**
 * Groq Cloud — OpenAI-compatible inference for Llama / Qwen / Gemma.
 *
 * Why Groq is the primary provider:
 *   • LPU inference is fast enough (~400 tok/s) to keep p50 first-token
 *     latency under 1s, which is critical on a medical assistant.
 *   • Generous free tier (currently 30 RPM, 14.4k TPM on llama-3.3-70b-versatile)
 *     covers all observed MedOS traffic without billing surprises.
 *   • llama-3.3-70b-versatile is large enough to follow a 3.7k-char
 *     clinical system prompt and structured output contract — the
 *     previous primary (qwen2.5:1.5b on a CPU-basic Space) was not.
 *
 * Configuration: set GROQ_API_KEY (env) or admin-rotate via
 * Admin → Server (lib/server-config.ts already persists `groqApiKey`).
 * The model can be overridden with GROQ_MODEL.
 */
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 15_000;

function getGroqKey(): string {
  try {
    const cfg = loadConfig();
    if (cfg.llm.groqApiKey) return cfg.llm.groqApiKey;
  } catch {
    // config unreadable; fall through to env
  }
  return process.env.GROQ_API_KEY || '';
}

function getGroqModel(): string {
  return process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
}

/** True iff a Groq key is reachable (admin config OR env). */
export function isGroqConfigured(): boolean {
  return !!getGroqKey();
}

function getClient(): OpenAI {
  return new OpenAI({
    baseURL: GROQ_BASE_URL,
    apiKey: getGroqKey(),
    timeout: GROQ_TIMEOUT_MS,
    maxRetries: 0,
  });
}

/**
 * Pick the model to send to Groq. The chat route passes through whatever
 * the client requested (default `qwen2.5:1.5b` — an Ollama tag that Groq
 * does not host). If the requested model is not a Groq SKU, fall back to
 * the configured Groq default so the call actually succeeds.
 */
function resolveModel(requested: string): string {
  const groqDefault = getGroqModel();
  if (!requested) return groqDefault;
  // Groq SKUs look like `llama-3.3-70b-versatile`, `qwen2.5-32b`,
  // `gemma2-9b-it`, `mixtral-8x7b-32768`, etc. Ollama tags contain a
  // colon (`qwen2.5:1.5b`). Reject Ollama-shaped names outright.
  if (requested.includes(':')) return groqDefault;
  // Heuristic: accept names that start with a known Groq family prefix.
  const groqFamilies = ['llama-', 'llama3', 'qwen', 'gemma', 'mixtral', 'deepseek'];
  const lower = requested.toLowerCase();
  if (groqFamilies.some((p) => lower.startsWith(p))) return requested;
  return groqDefault;
}

export async function chatWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ProviderResponse> {
  const model = resolveModel(requestedModel);
  const client = getClient();
  console.log(
    `[Chat] provider.groq.dispatch ${JSON.stringify({
      model,
      turns: messages.length,
    })}`,
  );
  const response = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    // 700 tokens fits the OUTPUT_CONTRACT structured response without
    // overrunning the route's ~50s edge budget at Groq's throughput.
    max_tokens: 700,
    temperature: 0.4,
    top_p: 0.9,
  });
  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'groq',
    model: response.model || model,
  };
}

export async function streamWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ReadableStream> {
  const model = resolveModel(requestedModel);
  const client = getClient();
  console.log(
    `[Chat] provider.groq.dispatch.stream ${JSON.stringify({
      model,
      turns: messages.length,
    })}`,
  );
  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: 700,
    temperature: 0.4,
    top_p: 0.9,
    stream: true,
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
              provider: 'groq',
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

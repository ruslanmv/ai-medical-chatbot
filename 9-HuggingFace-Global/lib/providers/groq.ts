import OpenAI from 'openai';
import type { ChatMessage, ProviderResponse } from './index';
import { loadConfig } from '@/lib/server-config';

/**
 * Groq Cloud — OpenAI-compatible inference, primary provider.
 *
 * Why Groq is the primary provider:
 *   • LPU inference is fast enough (~400 tok/s) to keep p50 first-token
 *     latency under 1s, which is critical on a medical assistant.
 *   • Generous free tier that covers all observed MedOS traffic.
 *   • The models below are large enough to follow a 7k-char clinical
 *     system prompt and the structured OUTPUT_CONTRACT — the previous
 *     primary (qwen2.5:1.5b on a CPU-basic Space) was not.
 *
 * MODEL IDS — READ BEFORE EDITING
 * ────────────────────────────────
 * Groq retired its hosted Llama chat SKUs during 2026:
 * `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `qwen/qwen3-32b`,
 * `mixtral-8x7b-32768`, `gemma2-9b-it` and
 * `moonshotai/kimi-k2-instruct-0905` all now answer
 * `404 model_decommissioned`. Groq points migrations at the `gpt-oss`
 * family, whose ids are namespaced under a vendor Groq does not own
 * (`openai/gpt-oss-20b`) — so an id containing a slash is NOT evidence
 * that the model belongs to some other provider.
 *
 * This chain mirrors the catalog OllaBridge-Cloud ships in
 * `addons/providers/catalog/model_defaults.yaml` (kind: groq), which is
 * the shared source of truth across the three repos. When Groq retires
 * another SKU, correct it there and here together.
 *
 * Configuration: set GROQ_API_KEY (env) or admin-rotate via
 * Admin → Server (lib/server-config.ts persists `groqApiKey`).
 * GROQ_MODEL overrides the head of the chain.
 *
 * Note on the API surface: Groq also exposes the OpenAI *Responses* API
 * (`client.responses.create({ input, model })`) at the same base URL.
 * We stay on `chat.completions` because MedOS needs multi-turn
 * system/user/assistant roles and token-level streaming deltas, both of
 * which the completions surface gives us directly.
 */
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Ordered fallback chain. Small-and-fastest first: `gpt-oss-20b` answers
 * a full MedOS turn in well under a second, and `120b` is the quality
 * step-up when 20b is rate-limited. `groq/compound-mini` is Groq's own
 * always-available house model and closes the chain.
 */
const GROQ_MODEL_CHAIN = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'groq/compound-mini',
];
const GROQ_DEFAULT_MODEL = GROQ_MODEL_CHAIN[0];

/**
 * SKUs Groq has retired. Requests naming one are rewritten onto the
 * chain rather than forwarded — forwarding earns a 404 and burns the
 * provider's slot in the MedOS fallback chain for no reason.
 */
const RETIRED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'gemma-7b-it',
  'qwen/qwen3-32b',
  'qwen-qwq-32b',
  'moonshotai/kimi-k2-instruct-0905',
]);

/** Namespaces/families Groq currently serves. */
const GROQ_FAMILY_PREFIXES = [
  'openai/gpt-oss',
  'groq/compound',
  'qwen/',
  'meta-llama/llama-4',
  'moonshotai/',
  'llama-',
  'deepseek-',
];

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
 * Build the ordered list of Groq models to try for this request.
 *
 * The chat route passes through whatever the client asked for — by
 * default `qwen2.5:1.5b`, an Ollama tag Groq does not host. Anything
 * that isn't a live Groq SKU is dropped in favour of the chain, and a
 * requested SKU that IS live is promoted to the front while keeping the
 * rest of the chain behind it as fallback.
 */
export function resolveModelChain(requested: string): string[] {
  const configured = process.env.GROQ_MODEL || '';
  // Admin/env override leads, then the standard chain.
  const base = configured
    ? [configured, ...GROQ_MODEL_CHAIN.filter((m) => m !== configured)]
    : [...GROQ_MODEL_CHAIN];

  const lower = (requested || '').trim().toLowerCase();
  if (!lower) return base;
  // Ollama tags carry a colon (`qwen2.5:1.5b`) — never a Groq SKU.
  if (lower.includes(':')) return base;
  if (RETIRED_GROQ_MODELS.has(lower)) return base;
  if (!GROQ_FAMILY_PREFIXES.some((p) => lower.startsWith(p))) return base;
  return [requested, ...base.filter((m) => m.toLowerCase() !== lower)];
}

/**
 * Is this failure about the *model* rather than the provider?
 *
 * A decommissioned or unknown model id must advance to the next rung of
 * the chain; a 401 (bad key), 429 (rate limit) or 5xx must fail the
 * provider immediately so MedOS moves on to OllaBridge instead of
 * replaying the same error three times.
 */
function isModelLevelError(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  if (status !== 404 && status !== 400) return false;
  const code = String(
    error?.error?.code || error?.code || error?.message || '',
  ).toLowerCase();
  return (
    code.includes('decommission') ||
    code.includes('model_not_found') ||
    code.includes('does not exist') ||
    code.includes('not found') ||
    status === 404
  );
}

function describe(error: any): string {
  const status = error?.status ?? error?.response?.status ?? '?';
  return `${status} ${String(error?.message || error).slice(0, 160)}`;
}

export async function chatWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ProviderResponse> {
  const chain = resolveModelChain(requestedModel);
  const client = getClient();
  const wire = messages.map((m) => ({ role: m.role, content: m.content }));
  let lastError: any = null;

  for (const model of chain) {
    const start = Date.now();
    try {
      const response = await client.chat.completions.create({
        model,
        messages: wire,
        // 700 tokens fits the OUTPUT_CONTRACT structured response without
        // overrunning the route's ~50s edge budget at Groq's throughput.
        max_tokens: 700,
        temperature: 0.4,
        top_p: 0.9,
      });
      console.log(
        `[Chat] provider.groq.attempt.nonstream ${JSON.stringify({
          model,
          latencyMs: Date.now() - start,
          result: 'ok',
        })}`,
      );
      return {
        content: response.choices[0]?.message?.content || '',
        provider: 'groq',
        model: response.model || model,
      };
    } catch (error: any) {
      lastError = error;
      const modelLevel = isModelLevelError(error);
      console.warn(
        `[Chat] provider.groq.attempt.nonstream ${JSON.stringify({
          model,
          latencyMs: Date.now() - start,
          error: describe(error),
          result: modelLevel ? 'fallback' : 'abort',
        })}`,
      );
      // Key, quota and transport failures are the provider's, not the
      // model's — stop here so the next MedOS provider gets its turn.
      if (!modelLevel) throw error;
    }
  }
  throw lastError ?? new Error('No Groq model available');
}

export async function streamWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ReadableStream> {
  const chain = resolveModelChain(requestedModel);
  const client = getClient();
  const wire = messages.map((m) => ({ role: m.role, content: m.content }));
  let stream: Awaited<
    ReturnType<typeof client.chat.completions.create>
  > | null = null;
  let activeModel = chain[0];
  let lastError: any = null;

  for (const model of chain) {
    const start = Date.now();
    try {
      stream = await client.chat.completions.create({
        model,
        messages: wire,
        max_tokens: 700,
        temperature: 0.4,
        top_p: 0.9,
        stream: true,
      });
      activeModel = model;
      console.log(
        `[Chat] provider.groq.attempt ${JSON.stringify({
          model,
          latencyMs: Date.now() - start,
          result: 'ok',
        })}`,
      );
      break;
    } catch (error: any) {
      lastError = error;
      const modelLevel = isModelLevelError(error);
      console.warn(
        `[Chat] provider.groq.attempt ${JSON.stringify({
          model,
          latencyMs: Date.now() - start,
          error: describe(error),
          result: modelLevel ? 'fallback' : 'abort',
        })}`,
      );
      if (!modelLevel) throw error;
    }
  }
  if (!stream) throw lastError ?? new Error('No Groq model available');

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream as any) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            const data = JSON.stringify({
              choices: [{ delta: { content } }],
              provider: 'groq',
              model: chunk.model || activeModel,
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

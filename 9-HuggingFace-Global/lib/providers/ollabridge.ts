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

  // Timeout: 45s.
  //
  // OllaBridge is now the SECONDARY provider (Groq is primary). When a
  // request reaches OllaBridge, Groq has already failed or is unconfigured,
  // and we still have to leave headroom for HuggingFace as the tertiary
  // fallback inside the same edge-function budget (~50s on Vercel /
  // ~60s on HF Spaces).
  //
  // Raised from 12s → 45s because the Cloud's own fallback chain
  // (HF 402 cascade → local-ollama on the Space) legitimately needs
  // ~24s end-to-end when the free HF tier is exhausted — observed in
  // production logs after the admin-issued API key flow shipped:
  //   provider.ollabridge.fail.nonstream {"error":"Request timed out."}
  //   …while the Cloud server completed in 24.198s via local-ollama.
  // 45s comfortably covers that worst case and still leaves ~15s for
  // the HF tertiary fallback inside the 60s HF Space budget. Healthy
  // routes (Groq/Gemini on the Cloud) still respond in <1s — the
  // ceiling only matters when the Cloud has to cascade.
  return new OpenAI({
    baseURL: `${baseURL.replace(/\/+$/, '')}/v1`,
    apiKey,
    timeout: 45000,
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

// ─────────────────────────────────────────────────────────────────────
// Circuit breaker
// ─────────────────────────────────────────────────────────────────────
// OllaBridge Cloud occasionally hangs for ~2 minutes when its routing
// chain hits a stalled `local-ollama` backend. On each such turn MedOS
// would pay the full 45 s OllaBridge timeout BEFORE falling through to
// HF — compounding badly across rapid retries.
//
// This is a process-local breaker:
//   - On every failure we increment `consecutiveFailures` and stamp
//     `lastFailureAt`.
//   - When `consecutiveFailures >= COOLDOWN_TRIGGER` the breaker opens
//     for `COOLDOWN_MS`, during which `isCircuitOpen()` returns true
//     and callers (the chat route) skip the OllaBridge attempt
//     entirely — going straight to HF for sub-second responses.
//   - The first successful call after cooldown closes the breaker.
//
// Operator override: `OLLABRIDGE_CIRCUIT_BREAKER=off` disables it.
// Tunable: `OLLABRIDGE_CIRCUIT_COOLDOWN_MS` (default 120 000).
const COOLDOWN_TRIGGER = 2;
const COOLDOWN_MS = Number(process.env.OLLABRIDGE_CIRCUIT_COOLDOWN_MS) || 120_000;
let consecutiveFailures = 0;
let openedAt = 0;

export function isCircuitOpen(): boolean {
  if (process.env.OLLABRIDGE_CIRCUIT_BREAKER === 'off') return false;
  if (consecutiveFailures < COOLDOWN_TRIGGER) return false;
  if (Date.now() - openedAt > COOLDOWN_MS) {
    // Cooldown expired — give the next request a chance to close it.
    return false;
  }
  return true;
}

export function recordSuccess(): void {
  if (consecutiveFailures > 0) {
    console.log('[Chat] provider.ollabridge.circuit.close');
  }
  consecutiveFailures = 0;
  openedAt = 0;
}

export function recordFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures === COOLDOWN_TRIGGER) {
    openedAt = Date.now();
    console.warn(
      `[Chat] provider.ollabridge.circuit.open cooldown=${COOLDOWN_MS}ms ` +
        `failures=${consecutiveFailures}`,
    );
  }
}

export async function streamWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ReadableStream> {
  if (isCircuitOpen()) {
    throw new Error('OllaBridge circuit open (recent failures) — skipping');
  }
  const client = getClient();
  console.log(
    `[Chat] provider.ollabridge.dispatch ${JSON.stringify({
      baseURL: client.baseURL,
      model,
      turns: messages.length,
    })}`,
  );

  let stream;
  try {
    stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      // 512 tokens: enough room for the structured OUTPUT_CONTRACT response.
      max_tokens: 512,
      temperature: 0.4,
    });
  } catch (err) {
    recordFailure();
    throw err;
  }

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
        recordSuccess();
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        recordFailure();
        controller.error(error);
      }
    },
  });
}

export async function chatWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  if (isCircuitOpen()) {
    // Circuit breaker: skip this attempt entirely so the caller falls
    // through to HF in milliseconds rather than waiting 45 s for the
    // known-stalled cloud. See the breaker block above for tunables.
    throw new Error('OllaBridge circuit open (recent failures) — skipping');
  }
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      // 512 tokens: enough for the structured OUTPUT_CONTRACT response.
      // Bounded by the 45s provider timeout above; healthy cloud rungs
      // finish in <1s, worst-case local-ollama fallback ~25s.
      max_tokens: 512,
      temperature: 0.4,
    });
    recordSuccess();
    return {
      content: response.choices[0]?.message?.content || '',
      provider: 'ollabridge',
      model: response.model || model,
    };
  } catch (err) {
    recordFailure();
    throw err;
  }
}

import OpenAI from 'openai';
import type { ChatMessage, ProviderResponse } from './index';
import { isGroqConfigured } from './groq';
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
  // Getting past the HF edge's anonymous rate limit.
  //
  // This Space and the gateway are both `*.hf.space` hosts, and HF's edge
  // meters requests to them per source IP — anonymous traffic gets the
  // smallest allowance. Spaces egress through shared NAT, so our calls
  // compete for that anonymous bucket with every other Space on the same
  // address. Measured: the identical request (same key, same body, same
  // SDK headers) got 200 in ~2-6s from a developer machine and a sustained
  // 429 with an HTML body in ~99ms from here — never reaching the gateway,
  // whose own logs show no such request at all.
  //
  // So when an HF token is available we spend `Authorization` on it, which
  // makes the edge bill the request to the account rather than the shared
  // anonymous IP, and hand the gateway its own credential on
  // `X-OllaBridge-Key`. The gateway reads that header ahead of
  // Authorization (see core/user_context.py), and HF forwards both
  // untouched. With no HF token we fall back to the original single-header
  // form, which is still correct — just rate-limited as before.
  const hfToken = getHfTokenForEdge();
  const headers: Record<string, string> = {};
  if (hfToken) headers['X-OllaBridge-Key'] = apiKey;

  return new OpenAI({
    baseURL: `${baseURL.replace(/\/+$/, '')}/v1`,
    apiKey: hfToken || apiKey,
    defaultHeaders: headers,
    timeout: resolveTimeoutMs(),
    maxRetries: 0,
  });
}

/**
 * How long to wait on the gateway — which depends on what else we have.
 *
 * 45s is the right ceiling when OllaBridge is the ONLY route: its chain
 * legitimately needs ~25s when the free cloud tiers are spent and it has
 * to fall to the on-Space CPU model, and waiting is strictly better than
 * failing.
 *
 * It is the wrong ceiling when a direct provider is configured here.
 * Measured in production right after OllaBridge became primary: the
 * gateway spent the full 45s walking to its CPU rung, then Groq answered
 * the same turn in 678ms — a 46s reply where 0.7s was available. Waiting
 * 45s to avoid a sub-second bypass is a bad trade on a medical
 * assistant, so when a bypass exists we give the gateway a shorter
 * window and fall through while the user is still with us.
 *
 * This is a latency guard, not a preference: OllaBridge is still tried
 * first every time, and the circuit breaker still bounds repeat cost.
 * Once the gateway has a provider key of its own it answers in well
 * under a second and this ceiling stops mattering at all.
 *
 * Override with OLLABRIDGE_TIMEOUT_MS.
 */
export function resolveTimeoutMs(): number {
  const override = Number(process.env.OLLABRIDGE_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) return override;
  return isGroqConfigured() ? 12_000 : 45_000;
}

/**
 * The HF token to present to the edge, if one is configured.
 *
 * Only used to attribute the request for rate limiting — the gateway
 * never authenticates against it. Empty string disables the scheme and
 * restores plain `Authorization: Bearer <ollabridge key>`.
 */
function getHfTokenForEdge(): string {
  if (process.env.OLLABRIDGE_EDGE_AUTH === 'off') return '';
  try {
    const cfg = loadConfig();
    if (cfg.llm.hfToken) return cfg.llm.hfToken;
  } catch {
    // config unreadable; fall through to env
  }
  return process.env.HF_TOKEN || '';
}

// ─────────────────────────────────────────────────────────────────────
// Which model name to ask OllaBridge-Cloud for
// ─────────────────────────────────────────────────────────────────────
// MedOS's client-side default is the Ollama tag `qwen2.5:1.5b`, and we
// used to forward it verbatim. That was the wrong name to send, because
// of the order OllaBridge-Cloud resolves a request in
// (`api/ollama_proxy.py::_handle_chat_local`):
//
//   1. HomePilot        2. RELAY DEVICE (exact model-id match)
//   3. alias → provider router        4. the Space's own CPU Ollama
//
// A concrete tag matches step 2 whenever a relay device advertises it,
// so every MedOS turn was being tunnelled over a WebSocket to whichever
// home PC happened to be paired — never reaching the Cloud's own
// provider chain. When that PC or the Space's router blinked we got the
// bare `503 status code (no body)` seen in production, two of those
// tripped the breaker below, and the whole route fell through to the
// HF free tier (all 402) and out to the degraded message.
//
// Sending an ALIAS instead skips steps 1-2 entirely and lands on step 3,
// the Cloud's multi-provider router — Groq → Gemini → OpenRouter → HF →
// its own always-on `local-ollama` last resort. That last rung is why
// `free-best` is the default here rather than `free-fast`: `free-fast`
// has no local rung and can genuinely exhaust, `free-best` cannot.
//
// Override with OLLABRIDGE_MODEL. A caller that names a real alias or a
// concrete model itself still wins — we only substitute Ollama-shaped
// tags, which are exactly the names that trigger relay interception.
const DEFAULT_OLLABRIDGE_ALIAS = 'free-best';

export function resolveOllaBridgeModel(requested: string): string {
  const configured = (process.env.OLLABRIDGE_MODEL || '').trim();
  const alias = configured || DEFAULT_OLLABRIDGE_ALIAS;
  const name = (requested || '').trim();
  if (!name) return alias;
  // Ollama tags carry a colon (`qwen2.5:1.5b`, `llama3.1:8b`) — these are
  // the relay-intercepted names. Anything else is passed through.
  return name.includes(':') ? alias : name;
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

/** Pause before retrying a rate-limited (429) gateway call. */
const RATE_LIMIT_RETRY_MS =
  Number(process.env.OLLABRIDGE_RATE_LIMIT_RETRY_MS) || 1_200;

/** True for a 429 from the gateway or the edge in front of it. */
export function isRateLimited(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  if (status === 429) return true;
  return /\b429\b/.test(String(error?.message || ''));
}
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
  const wireModel = resolveOllaBridgeModel(model);
  console.log(
    `[Chat] provider.ollabridge.dispatch ${JSON.stringify({
      baseURL: client.baseURL,
      requested: model,
      model: wireModel,
      turns: messages.length,
    })}`,
  );

  let stream;
  try {
    stream = await client.chat.completions.create({
      model: wireModel,
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
              model: chunk.model || wireModel,
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
  const wireModel = resolveOllaBridgeModel(model);
  console.log(
    `[Chat] provider.ollabridge.dispatch.nonstream ${JSON.stringify({
      // baseURL is logged here as well as on the streaming path: a
      // misconfigured OLLABRIDGE_URL and a healthy-but-throttled
      // gateway both surface as an opaque upstream error, and without
      // the URL in the line there is no way to tell them apart from
      // the Space logs alone.
      baseURL: client.baseURL,
      requested: model,
      model: wireModel,
      turns: messages.length,
    })}`,
  );

  const body = {
    model: wireModel,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    // 512 tokens: enough for the structured OUTPUT_CONTRACT response.
    // Bounded by the 45s provider timeout above; healthy cloud rungs
    // finish in <1s, worst-case local-ollama fallback ~25s.
    max_tokens: 512,
    temperature: 0.4,
  };

  try {
    let response;
    try {
      response = await client.chat.completions.create(body);
    } catch (err: any) {
      // 429 is rate limiting, not a broken upstream — retry it once.
      //
      // Observed in production after this Space and the gateway were
      // both redeployed: the gateway answered every request from a
      // developer machine in ~2.2s, while the same call from this Space
      // came back as `429` with an HTML body in ~90ms. An HTML body
      // means the rejection came from the HF edge, not the gateway
      // app — Space-to-Space traffic leaves through shared egress
      // addresses, so it competes for an anonymous per-IP allowance
      // that a single developer machine never approaches.
      //
      // One short retry clears the transient case well inside the
      // route's ~50s budget. If it does not, we fall through to the
      // normal failure path and the caller moves on, exactly as before.
      if (!isRateLimited(err)) throw err;
      console.warn(
        `[Chat] provider.ollabridge.rate_limited ${JSON.stringify({
          retryInMs: RATE_LIMIT_RETRY_MS,
        })}`,
      );
      await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
      response = await client.chat.completions.create(body);
    }
    recordSuccess();
    return {
      content: response.choices[0]?.message?.content || '',
      provider: 'ollabridge',
      model: response.model || wireModel,
    };
  } catch (err) {
    recordFailure();
    throw err;
  }
}

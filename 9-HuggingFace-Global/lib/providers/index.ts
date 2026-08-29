import {
  streamWithOllaBridge,
  chatWithOllaBridge,
  isOllaBridgeConfigured,
} from './ollabridge';
import {
  streamWithHuggingFace,
  chatWithHuggingFace,
} from './huggingface-direct';
import {
  streamWithGroq,
  chatWithGroq,
  isGroqConfigured,
} from './groq';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
}

/**
 * Thrown when every configured LLM provider fails for a request. The
 * chat route translates this into a user-facing "service unavailable"
 * SSE error event. We do NOT fall back to a canned response: a
 * keyword-matched dictionary that speaks in the voice of a medical AI
 * is worse than no answer at all — users assume it came from the
 * model and act on it.
 */
export class AllProvidersUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllProvidersUnavailableError';
  }
}

/**
 * Structured logger that prefixes every line with `[Chat]` so the HF Space
 * logs API can be grepped for a single request end-to-end.
 */
function log(stage: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[Chat] ${stage}${payload}`);
}

/**
 * Stream chat completion with automatic fallback chain:
 *   1. OllaBridge-Cloud — PRIMARY. The gateway is the routing authority:
 *      one admin defines the free provider fleet there (Groq, Gemini,
 *      OpenRouter, HF, on-Space Ollama), orders it best-first, and every
 *      consumer inherits that. MedOS asks for an alias and lets the
 *      gateway pick the best live model, rather than second-guessing it.
 *      Its chain ends at an always-on local rung, so it answers even when
 *      every cloud tier is spent.
 *   2. Groq direct — a BYPASS for when the gateway itself is unreachable
 *      (redeploying, rate-limited, misconfigured). Off unless
 *      GROQ_API_KEY is set here; a key on the gateway is the better place
 *      for it, because every consumer benefits rather than just MedOS.
 *   3. Direct HuggingFace Inference API — last resort. Kept for
 *      compatibility but most rungs currently return 402 on the free tier.
 *
 * Ordering note: Groq used to lead because it was the fastest single
 * provider. That put MedOS's own opinion ahead of the fleet the admin
 * curates, and meant a key had to be pasted into every consumer
 * separately. The gateway now leads and the direct providers are the
 * escape hatch.
 *
 * If every provider fails, throws AllProvidersUnavailableError. There is
 * intentionally NO "cached FAQ" fallback: a keyword dictionary speaking
 * in the voice of a medical AI is worse than an honest error.
 *
 * Each step logs its decision so the workflow can be traced from the
 * HF Space run logs.
 */
export async function streamWithFallback(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ReadableStream> {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const userTurn = messages.filter((m) => m.role === 'user').pop();
  log('request.start', {
    requestId,
    model,
    turns: messages.length,
    userChars: userTurn?.content.length ?? 0,
  });

  const failures: string[] = [];

  // Step 1 — OllaBridge (primary, the admin's curated fleet). Skipped
  // only when no OLLABRIDGE_URL is configured at all.
  if (isOllaBridgeConfigured()) {
    const t0 = Date.now();
    try {
      const stream = await streamWithOllaBridge(messages, model);
      log('provider.ollabridge.ok', {
        requestId,
        latencyMs: Date.now() - t0,
        totalMs: Date.now() - startedAt,
      });
      return stream;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log('provider.ollabridge.fail', {
        requestId,
        latencyMs: Date.now() - t0,
        error: msg,
      });
      failures.push(`ollabridge: ${msg}`);
    }
  } else {
    log('provider.ollabridge.skipped', { requestId, reason: 'not configured' });
  }

  // Step 2 — Groq direct, a bypass for when the gateway is unreachable.
  if (isGroqConfigured()) {
    const tg = Date.now();
    try {
      const stream = await streamWithGroq(messages, model);
      log('provider.groq.ok', {
        requestId,
        latencyMs: Date.now() - tg,
        totalMs: Date.now() - startedAt,
      });
      return stream;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log('provider.groq.fail', {
        requestId,
        latencyMs: Date.now() - tg,
        error: msg,
      });
      failures.push(`groq: ${msg}`);
    }
  } else {
    log('provider.groq.skipped', {
      requestId,
      reason: 'not configured',
      hint: 'optional bypass — OllaBridge is the primary route',
    });
  }

  // Step 3 — HuggingFace Inference (cascades internally through 9 models).
  const t1 = Date.now();
  try {
    const stream = await streamWithHuggingFace(messages);
    log('provider.huggingface.ok', {
      requestId,
      latencyMs: Date.now() - t1,
      totalMs: Date.now() - startedAt,
    });
    return stream;
  } catch (error: any) {
    const msg = String(error?.message || error).slice(0, 200);
    log('provider.huggingface.fail', {
      requestId,
      latencyMs: Date.now() - t1,
      error: msg,
    });
    failures.push(`huggingface: ${msg}`);
  }

  // All providers failed. We do NOT pretend with a canned response.
  log('provider.all_failed', {
    requestId,
    totalMs: Date.now() - startedAt,
    failures,
  });
  throw new AllProvidersUnavailableError(
    'All LLM providers are currently unavailable. Please try again in a moment.',
  );
}

/**
 * Non-streaming chat completion with fallback chain.
 * Mirrors streamWithFallback — same decisions, same logs, same
 * AllProvidersUnavailableError on total failure.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  const requestId = Math.random().toString(36).slice(2, 10);
  log('request.start.nonstream', { requestId, model });

  const failures: string[] = [];

  // Step 1 — OllaBridge (primary). See the ordering note on
  // streamWithFallback: the gateway is the routing authority.
  if (isOllaBridgeConfigured()) {
    const tb = Date.now();
    try {
      const resp = await chatWithOllaBridge(messages, model);
      log('provider.ollabridge.ok.nonstream', {
        requestId,
        latencyMs: Date.now() - tb,
        model: resp.model,
      });
      return resp;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log('provider.ollabridge.fail.nonstream', {
        requestId,
        latencyMs: Date.now() - tb,
        error: msg,
      });
      failures.push(`ollabridge: ${msg}`);
    }
  } else {
    log('provider.ollabridge.skipped.nonstream', { requestId });
  }

  // Step 2 — Groq direct, only as a bypass when the gateway is down.
  if (isGroqConfigured()) {
    const tg = Date.now();
    try {
      const resp = await chatWithGroq(messages, model);
      log('provider.groq.ok.nonstream', {
        requestId,
        latencyMs: Date.now() - tg,
        model: resp.model,
      });
      return resp;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log('provider.groq.fail.nonstream', {
        requestId,
        latencyMs: Date.now() - tg,
        error: msg,
      });
      failures.push(`groq: ${msg}`);
    }
  } else {
    log('provider.groq.skipped.nonstream', {
      requestId,
      reason: 'not configured',
      hint: 'optional bypass — OllaBridge is the primary route',
    });
  }

  try {
    const resp = await chatWithHuggingFace(messages);
    log('provider.huggingface.ok.nonstream', { requestId });
    return resp;
  } catch (error: any) {
    const msg = String(error?.message || error).slice(0, 200);
    log('provider.huggingface.fail.nonstream', { requestId, error: msg });
    failures.push(`huggingface: ${msg}`);
  }

  log('provider.all_failed.nonstream', { requestId, failures });
  throw new AllProvidersUnavailableError(
    'All LLM providers are currently unavailable. Please try again in a moment.',
  );
}

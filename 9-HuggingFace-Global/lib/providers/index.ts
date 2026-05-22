import {
  streamWithOllaBridge,
  chatWithOllaBridge,
  isOllaBridgeConfigured,
} from './ollabridge';
import {
  streamWithHuggingFace,
  chatWithHuggingFace,
} from './huggingface-direct';

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
 *   1. OllaBridge-Cloud — only if admin has set OllaBridge URL.
 *   2. Direct HuggingFace Inference API — 12-model cascade.
 *
 * If both providers fail, throws AllProvidersUnavailableError so the
 * chat route can surface a clean "service unavailable" message to the
 * user. There is intentionally NO third "cached FAQ" fallback: a
 * static keyword dictionary that pretends to be the AI is worse than
 * an honest error (users acted on it as if it were a real answer, and
 * its keyword scoring routinely matched unrelated topics, e.g.
 * "my child has fever" surfacing a malaria preamble).
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

  // Step 1 — OllaBridge (only when the admin has set OLLABRIDGE_URL).
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

  // Step 2 — HuggingFace Inference (cascades internally through 12 models).
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

  if (isOllaBridgeConfigured()) {
    try {
      const resp = await chatWithOllaBridge(messages, model);
      log('provider.ollabridge.ok.nonstream', { requestId });
      return resp;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log('provider.ollabridge.fail.nonstream', { requestId, error: msg });
      failures.push(`ollabridge: ${msg}`);
    }
  } else {
    log('provider.ollabridge.skipped.nonstream', { requestId });
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

import {
  streamWithOllaBridge,
  chatWithOllaBridge,
  isOllaBridgeConfigured,
} from './ollabridge';
import {
  streamWithHuggingFace,
  chatWithHuggingFace,
} from './huggingface-direct';
import { getCachedFAQResponse } from './cached-faq';

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
 * Structured logger that prefixes every line with `[Chat]` so the HF Space
 * logs API can be grepped for a single request end-to-end.
 */
function log(stage: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[Chat] ${stage}${payload}`);
}

/**
 * Stream chat completion with automatic fallback chain:
 * 1. OllaBridge-Cloud — only if admin has set OllaBridge URL
 * 2. Direct HuggingFace Inference API — 12-model cascade
 * 3. Cached FAQ response — always works, even offline
 *
 * Each step logs its decision so the workflow can be traced from the
 * HF Space run logs. On failure, the NEXT step is tried automatically.
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

  // Step 1 — OllaBridge (only when the admin has set OLLABRIDGE_URL).
  // Skipping the try when unconfigured avoids burning latency on a
  // default URL that may not correspond to the user's gateway.
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
      log('provider.ollabridge.fail', {
        requestId,
        latencyMs: Date.now() - t0,
        error: String(error?.message || error).slice(0, 200),
      });
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
    log('provider.huggingface.fail', {
      requestId,
      latencyMs: Date.now() - t1,
      error: String(error?.message || error).slice(0, 200),
    });
  }

  // Step 3 — Cached FAQ (always succeeds).
  const faqResponse = getCachedFAQResponse(userTurn?.content || '');
  log('provider.cached-faq.used', {
    requestId,
    totalMs: Date.now() - startedAt,
    faqChars: faqResponse.length,
  });

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            choices: [{ delta: { content: faqResponse } }],
            provider: 'cached-faq',
            model: 'offline',
          })}\n\n`,
        ),
      );
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

/**
 * Non-streaming chat completion with fallback chain.
 * Mirrors streamWithFallback — same decisions, same logs.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  const requestId = Math.random().toString(36).slice(2, 10);
  log('request.start.nonstream', { requestId, model });

  if (isOllaBridgeConfigured()) {
    try {
      const resp = await chatWithOllaBridge(messages, model);
      log('provider.ollabridge.ok.nonstream', { requestId });
      return resp;
    } catch (error: any) {
      log('provider.ollabridge.fail.nonstream', {
        requestId,
        error: String(error?.message || error).slice(0, 200),
      });
    }
  } else {
    log('provider.ollabridge.skipped.nonstream', { requestId });
  }

  try {
    const resp = await chatWithHuggingFace(messages);
    log('provider.huggingface.ok.nonstream', { requestId });
    return resp;
  } catch (error: any) {
    log('provider.huggingface.fail.nonstream', {
      requestId,
      error: String(error?.message || error).slice(0, 200),
    });
  }

  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  log('provider.cached-faq.used.nonstream', { requestId });
  return {
    content: getCachedFAQResponse(lastUserMessage?.content || ''),
    provider: 'cached-faq',
    model: 'offline',
  };
}

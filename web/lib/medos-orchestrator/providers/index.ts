/**
 * MedOS chat provider fallback chain — Vercel port.
 *
 * Ported from `9-HuggingFace-Global/lib/providers/` (the HF Space pipeline
 * that's been hardened in production). The Space version reads admin-rotated
 * keys from a SQLite-backed `loadConfig()`; on Vercel we don't have that
 * store, so each provider reads env vars exclusively. Admin runtime config
 * remains an HF-Space-only feature for now.
 *
 * Fallback order (mirrors the Space):
 *   1. Groq Cloud           (GROQ_API_KEY)            — primary
 *   2. OllaBridge Cloud     (OLLABRIDGE_URL/_API_KEY) — secondary
 *   3. HF Inference Router  (HF_TOKEN)                — tertiary 9-model cascade
 *
 * On total failure, `AllProvidersUnavailableError` is thrown so the route
 * can map it to a clean SSE error frame. We deliberately do NOT fall back
 * to a canned FAQ: a keyword-matched dictionary speaking in the voice of a
 * medical AI is worse than no answer at all.
 */

import {
  streamWithOllaBridge,
  chatWithOllaBridge,
  isOllaBridgeConfigured,
} from "./ollabridge";
import {
  streamWithHuggingFace,
  chatWithHuggingFace,
} from "./huggingface-direct";
import { streamWithGroq, chatWithGroq, isGroqConfigured } from "./groq";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
}

export class AllProvidersUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllProvidersUnavailableError";
  }
}

function log(stage: string, details?: Record<string, unknown>) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[Chat] ${stage}${payload}`);
}

export async function streamWithFallback(
  messages: ChatMessage[],
  model: string = "qwen2.5:1.5b",
): Promise<ReadableStream> {
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  const userTurn = messages.filter((m) => m.role === "user").pop();
  log("request.start", {
    requestId,
    model,
    turns: messages.length,
    userChars: userTurn?.content.length ?? 0,
  });

  const failures: string[] = [];

  if (isGroqConfigured()) {
    const tg = Date.now();
    try {
      const stream = await streamWithGroq(messages, model);
      log("provider.groq.ok", {
        requestId,
        latencyMs: Date.now() - tg,
        totalMs: Date.now() - startedAt,
      });
      return stream;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log("provider.groq.fail", {
        requestId,
        latencyMs: Date.now() - tg,
        error: msg,
      });
      failures.push(`groq: ${msg}`);
    }
  } else {
    log("provider.groq.skipped", { requestId, reason: "not configured" });
  }

  if (isOllaBridgeConfigured()) {
    const t0 = Date.now();
    try {
      const stream = await streamWithOllaBridge(messages, model);
      log("provider.ollabridge.ok", {
        requestId,
        latencyMs: Date.now() - t0,
        totalMs: Date.now() - startedAt,
      });
      return stream;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log("provider.ollabridge.fail", {
        requestId,
        latencyMs: Date.now() - t0,
        error: msg,
      });
      failures.push(`ollabridge: ${msg}`);
    }
  } else {
    log("provider.ollabridge.skipped", { requestId, reason: "not configured" });
  }

  const t1 = Date.now();
  try {
    const stream = await streamWithHuggingFace(messages);
    log("provider.huggingface.ok", {
      requestId,
      latencyMs: Date.now() - t1,
      totalMs: Date.now() - startedAt,
    });
    return stream;
  } catch (error: any) {
    const msg = String(error?.message || error).slice(0, 200);
    log("provider.huggingface.fail", {
      requestId,
      latencyMs: Date.now() - t1,
      error: msg,
    });
    failures.push(`huggingface: ${msg}`);
  }

  log("provider.all_failed", {
    requestId,
    totalMs: Date.now() - startedAt,
    failures,
  });
  throw new AllProvidersUnavailableError(
    "All LLM providers are currently unavailable. Please try again in a moment.",
  );
}

export async function chatWithFallback(
  messages: ChatMessage[],
  model: string = "qwen2.5:1.5b",
): Promise<ProviderResponse> {
  const requestId = Math.random().toString(36).slice(2, 10);
  log("request.start.nonstream", { requestId, model });

  const failures: string[] = [];

  if (isGroqConfigured()) {
    const tg = Date.now();
    try {
      const resp = await chatWithGroq(messages, model);
      log("provider.groq.ok.nonstream", {
        requestId,
        latencyMs: Date.now() - tg,
        model: resp.model,
      });
      return resp;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log("provider.groq.fail.nonstream", {
        requestId,
        latencyMs: Date.now() - tg,
        error: msg,
      });
      failures.push(`groq: ${msg}`);
    }
  } else {
    log("provider.groq.skipped.nonstream", { requestId });
  }

  if (isOllaBridgeConfigured()) {
    try {
      const resp = await chatWithOllaBridge(messages, model);
      log("provider.ollabridge.ok.nonstream", { requestId });
      return resp;
    } catch (error: any) {
      const msg = String(error?.message || error).slice(0, 200);
      log("provider.ollabridge.fail.nonstream", { requestId, error: msg });
      failures.push(`ollabridge: ${msg}`);
    }
  } else {
    log("provider.ollabridge.skipped.nonstream", { requestId });
  }

  try {
    const resp = await chatWithHuggingFace(messages);
    log("provider.huggingface.ok.nonstream", { requestId });
    return resp;
  } catch (error: any) {
    const msg = String(error?.message || error).slice(0, 200);
    log("provider.huggingface.fail.nonstream", { requestId, error: msg });
    failures.push(`huggingface: ${msg}`);
  }

  log("provider.all_failed.nonstream", { requestId, failures });
  throw new AllProvidersUnavailableError(
    "All LLM providers are currently unavailable. Please try again in a moment.",
  );
}

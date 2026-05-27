/**
 * OllaBridge Cloud client — the LLM gateway MedOS uses for inference.
 *
 * Contract: OllaBridge Cloud exposes a fully OpenAI-compatible
 *   POST /v1/chat/completions
 * with bearer-token auth (`OLLABRIDGE_API_KEY`). See
 *   ollabridge-cloud/src/ollabridge_cloud/api/compat.py
 * for the upstream definition.
 *
 * Environment variables (server-only — NEVER exposed to the browser):
 *   OLLABRIDGE_BASE_URL   e.g. https://your-domain/v1
 *                         (compat layer exposes /v1/chat/completions)
 *   OLLABRIDGE_API_KEY    ob_... bearer token minted in the admin UI
 *   OLLABRIDGE_MODEL      default model alias, e.g. "local-private"
 *   OLLABRIDGE_TIMEOUT_MS soft timeout for the HTTP call (default 45000)
 *
 * Streaming: returns an SSE response body the orchestrator pipes
 * straight through to the browser. We deliberately don't buffer —
 * the chat UX is streaming-first and the cold-start cushion lives in
 * the Vercel function timeout.
 */

import type { WireMessage } from "./conversation-state";

export interface OllaBridgeStreamOptions {
  /** Full message array — system prompt at index 0, then conversation. */
  messages: WireMessage[];
  /** Override the env-configured model alias for this call. */
  model?: string;
  /** Optional per-call timeout in ms. */
  timeoutMs?: number;
}

/** Resolved OllaBridge configuration. Throws a clear error if the
 *  server is missing required env vars, so the API route can return a
 *  structured 503 instead of a generic crash. */
export function loadOllaBridgeConfig() {
  // Accept both spellings (OLLABRIDGE_* and the legacy OLLAMBRIDGE_*
  // typo that appears in some early docs) so we don't break existing
  // deployments while the env-var convention settles.
  const baseURL =
    process.env.OLLABRIDGE_BASE_URL ||
    process.env.OLLAMBRIDGE_BASE_URL ||
    process.env.OLLABRIDGE_URL;
  const apiKey =
    process.env.OLLABRIDGE_API_KEY || process.env.OLLAMBRIDGE_API_KEY;
  const model =
    process.env.OLLABRIDGE_MODEL ||
    process.env.OLLAMBRIDGE_MODEL ||
    "local-private";
  const timeoutMs = Number(
    process.env.OLLABRIDGE_TIMEOUT_MS ||
      process.env.OLLAMBRIDGE_TIMEOUT_MS ||
      45000,
  );
  if (!baseURL) {
    throw new OllaBridgeNotConfigured(
      "Set OLLABRIDGE_BASE_URL on the server.",
    );
  }
  return {
    baseURL: baseURL.replace(/\/+$/, ""),
    apiKey,
    model,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 45000,
  };
}

export class OllaBridgeNotConfigured extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllaBridgeNotConfigured";
  }
}

/**
 * Stream a chat completion from OllaBridge Cloud. Returns the upstream
 * Response so the route can pipe `res.body` straight to the client.
 *
 * The caller owns aborting: pass `signal` from the route's
 * `AbortController` so the upstream request stops if the client
 * disconnects.
 */
export async function streamChatCompletion(
  opts: OllaBridgeStreamOptions & { signal?: AbortSignal },
): Promise<Response> {
  const cfg = loadOllaBridgeConfig();
  const model = opts.model || cfg.model;

  const url = `${cfg.baseURL}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  // Build the OpenAI-compatible body. We don't pin temperature here —
  // the model has its own SFT-tuned default and we want options to
  // vary across reruns of the same case (an explicit goal of the
  // AI-first behaviour).
  const body = {
    model,
    messages: opts.messages,
    stream: true,
  };

  // Wire-level timeout. The function-level timeout in the route is the
  // real safety net; this one bounds the upstream connect/first-byte
  // window so a stuck node never holds the function open until the
  // platform kill.
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? cfg.timeoutMs);
  // Compose with the caller's signal so external aborts still work.
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => ctl.abort(), { once: true });
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    // Clear the timeout once the upstream stream starts — long-running
    // generations are expected and shouldn't trip the connect timer.
    clearTimeout(t);
    return upstream;
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

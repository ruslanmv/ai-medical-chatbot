/**
 * OllaBridge Cloud provider — ported from the HF Space `lib/providers/`
 * pipeline. Differences vs. the Space version:
 *
 *   - No `loadConfig()` — Vercel has no SQLite admin store, so URL and
 *     key are read from env vars exclusively (OLLABRIDGE_URL /
 *     OLLABRIDGE_BASE_URL / OLLABRIDGE_API_KEY).
 *   - Same SSE re-encoding (extracts `delta.content`, wraps in a clean
 *     `data: {choices,delta,provider,model}\n\n` frame) so the client
 *     always sees the same OpenAI-compatible shape regardless of what
 *     OllaBridge sends back.
 *   - Same process-local circuit breaker (cooldown after 2 consecutive
 *     failures) so a stuck upstream doesn't compound across retries.
 *
 * Default model is `qwen2.5:1.5b` — verified to serve real content on
 * the shared `ruslanmv-ollabridge.hf.space` instance. The legacy
 * `local-private` alias is a stub responder and is no longer used.
 */

import OpenAI from "openai";
import type { ChatMessage, ProviderResponse } from "./index";

function readBaseURL(): string {
  return (
    process.env.OLLABRIDGE_URL ||
    process.env.OLLABRIDGE_BASE_URL ||
    "https://ruslanmv-ollabridge.hf.space"
  );
}

function readApiKey(): string {
  return process.env.OLLABRIDGE_API_KEY || "not-required";
}

function getClient(): OpenAI {
  const baseURL = readBaseURL();
  // Tolerate the bare-root form (the admin Server tab convention) AND
  // the /v1-suffixed form (.env.example convention) — the OpenAI SDK
  // always wants the /v1 prefix because it appends /chat/completions.
  const trimmed = baseURL.replace(/\/+$/, "");
  const v1 = /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
  return new OpenAI({
    baseURL: v1,
    apiKey: readApiKey(),
    timeout: 45000,
    maxRetries: 0,
  });
}

export function isOllaBridgeConfigured(): boolean {
  return !!(process.env.OLLABRIDGE_URL || process.env.OLLABRIDGE_BASE_URL);
}

// ─────────────────────────────────────────────────────────────────────
// Circuit breaker — when OllaBridge starts hanging, skip it for a
// cooldown window so the route falls straight through to HF Inference.
// ─────────────────────────────────────────────────────────────────────
const COOLDOWN_TRIGGER = 2;
const COOLDOWN_MS =
  Number(process.env.OLLABRIDGE_CIRCUIT_COOLDOWN_MS) || 120_000;
let consecutiveFailures = 0;
let openedAt = 0;

export function isCircuitOpen(): boolean {
  if (process.env.OLLABRIDGE_CIRCUIT_BREAKER === "off") return false;
  if (consecutiveFailures < COOLDOWN_TRIGGER) return false;
  if (Date.now() - openedAt > COOLDOWN_MS) return false;
  return true;
}

export function recordSuccess(): void {
  if (consecutiveFailures > 0) {
    console.log("[Chat] provider.ollabridge.circuit.close");
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
  model: string = "qwen2.5:1.5b",
): Promise<ReadableStream> {
  if (isCircuitOpen()) {
    throw new Error("OllaBridge circuit open (recent failures) — skipping");
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
              provider: "ollabridge",
              model: chunk.model || model,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        recordSuccess();
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
  model: string = "qwen2.5:1.5b",
): Promise<ProviderResponse> {
  if (isCircuitOpen()) {
    throw new Error("OllaBridge circuit open (recent failures) — skipping");
  }
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 512,
      temperature: 0.4,
    });
    recordSuccess();
    return {
      content: response.choices[0]?.message?.content || "",
      provider: "ollabridge",
      model: response.model || model,
    };
  } catch (err) {
    recordFailure();
    throw err;
  }
}

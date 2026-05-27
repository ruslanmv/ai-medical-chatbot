/**
 * HuggingFace Inference Providers router — tertiary fallback.
 *
 * Ported from the HF Space `lib/providers/huggingface-direct.ts`.
 * Env-only token resolution on Vercel (admin token rotation is
 * HF-Space-only for now).
 *
 * Uses router.huggingface.co with a deep fallback chain of verified
 * working models. Provider pinning via :suffix syntax routes to
 * specific backends (sambanova, together, etc.).
 *
 * Configuration: HF_TOKEN (required), HF_DEFAULT_MODEL (optional —
 * inserted at the top of the chain if set).
 */

import type { ChatMessage, ProviderResponse } from "./index";

const HF_BASE_URL = "https://router.huggingface.co/v1";

function getHfToken(): string {
  return process.env.HF_TOKEN || "";
}

function getAdminDefaultModel(): string {
  return process.env.HF_DEFAULT_MODEL || "";
}

const BASE_MODEL_CHAIN = [
  "meta-llama/Llama-3.3-70B-Instruct:sambanova",
  "meta-llama/Llama-3.3-70B-Instruct:together",
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "Qwen/Qwen3-235B-A22B",
  "google/gemma-3-27b-it",
  "meta-llama/Llama-3.1-70B-Instruct",
  "Qwen/Qwen3-32B",
  "deepseek-ai/DeepSeek-V3-0324",
];

function getModelChain(): string[] {
  const adminDefault = getAdminDefaultModel();
  if (!adminDefault) return BASE_MODEL_CHAIN;
  return [adminDefault, ...BASE_MODEL_CHAIN.filter((m) => m !== adminDefault)];
}

async function callHF(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
): Promise<Response> {
  const token = getHfToken();
  return fetch(`${HF_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
      stream,
    }),
  });
}

export async function streamWithHuggingFace(
  messages: ChatMessage[],
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const token = getHfToken();
  if (!token) {
    console.error(
      "[Chat] provider.huggingface.no-token — set HF_TOKEN env var",
    );
    throw new Error("HF token not configured (set HF_TOKEN env var)");
  }

  const chain = getModelChain();
  let response: Response | null = null;
  let activeModel = chain[0];
  for (const model of chain) {
    const start = Date.now();
    const res = await callHF(messages, model, true);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      console.log(
        `[Chat] provider.huggingface.attempt ${JSON.stringify({
          model,
          status: res.status,
          latencyMs,
          result: "ok",
        })}`,
      );
      response = res;
      activeModel = model;
      break;
    }
    console.warn(
      `[Chat] provider.huggingface.attempt ${JSON.stringify({
        model,
        status: res.status,
        latencyMs,
        result: "fallback",
      })}`,
    );
  }
  if (!response || !response.ok) {
    throw new Error("All HF Inference models unavailable");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  return new ReadableStream({
    async start(controller) {
      try {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const data = JSON.stringify({
                    choices: [{ delta: { content } }],
                    provider: "huggingface",
                    model: activeModel,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function chatWithHuggingFace(
  messages: ChatMessage[],
): Promise<ProviderResponse> {
  if (!getHfToken()) {
    console.error("[Chat] provider.huggingface.no-token.nonstream");
    throw new Error("HF token not configured");
  }
  const chain = getModelChain();
  let response: Response | null = null;
  let activeModel = chain[0];
  for (const model of chain) {
    const start = Date.now();
    const res = await callHF(messages, model, false);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      console.log(
        `[Chat] provider.huggingface.attempt.nonstream ${JSON.stringify({
          model,
          status: res.status,
          latencyMs,
          result: "ok",
        })}`,
      );
      response = res;
      activeModel = model;
      break;
    }
    console.warn(
      `[Chat] provider.huggingface.attempt.nonstream ${JSON.stringify({
        model,
        status: res.status,
        latencyMs,
        result: "fallback",
      })}`,
    );
  }
  if (!response || !response.ok) {
    throw new Error("All HF Inference models unavailable");
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    provider: "huggingface",
    model: activeModel,
  };
}

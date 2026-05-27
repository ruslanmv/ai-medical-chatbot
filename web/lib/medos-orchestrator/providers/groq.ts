/**
 * Groq Cloud — primary LLM provider in the fallback chain.
 *
 * Ported from the HF Space `lib/providers/groq.ts`. Env-only key
 * resolution on Vercel (admin key rotation is HF-Space-only for now).
 *
 * Why Groq is primary:
 *   - LPU inference keeps p50 first-token latency under 1s.
 *   - Free tier (30 RPM / 14.4k TPM on llama-3.3-70b-versatile) covers
 *     observed MedOS traffic without billing surprises.
 *   - llama-3.3-70b-versatile reliably follows a 3.7k-char clinical
 *     system prompt and the OUTPUT_CONTRACT structured response.
 *
 * Configuration: GROQ_API_KEY (required), GROQ_MODEL (optional).
 */

import OpenAI from "openai";
import type { ChatMessage, ProviderResponse } from "./index";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 15_000;

function getGroqKey(): string {
  return process.env.GROQ_API_KEY || "";
}

function getGroqModel(): string {
  return process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
}

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

function resolveModel(requested: string): string {
  const groqDefault = getGroqModel();
  if (!requested) return groqDefault;
  // Ollama tags contain a colon (`qwen2.5:1.5b`) — Groq doesn't host
  // those, so substitute the configured Groq default.
  if (requested.includes(":")) return groqDefault;
  const groqFamilies = [
    "llama-",
    "llama3",
    "qwen",
    "gemma",
    "mixtral",
    "deepseek",
  ];
  const lower = requested.toLowerCase();
  if (groqFamilies.some((p) => lower.startsWith(p))) return requested;
  return groqDefault;
}

export async function chatWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ProviderResponse> {
  const model = resolveModel(requestedModel);
  const client = getClient();
  console.log(
    `[Chat] provider.groq.dispatch ${JSON.stringify({
      model,
      turns: messages.length,
    })}`,
  );
  const response = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: 700,
    temperature: 0.4,
    top_p: 0.9,
  });
  return {
    content: response.choices[0]?.message?.content || "",
    provider: "groq",
    model: response.model || model,
  };
}

export async function streamWithGroq(
  messages: ChatMessage[],
  requestedModel: string,
): Promise<ReadableStream> {
  const model = resolveModel(requestedModel);
  const client = getClient();
  console.log(
    `[Chat] provider.groq.dispatch.stream ${JSON.stringify({
      model,
      turns: messages.length,
    })}`,
  );
  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: 700,
    temperature: 0.4,
    top_p: 0.9,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            const data = JSON.stringify({
              choices: [{ delta: { content } }],
              provider: "groq",
              model: chunk.model || model,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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

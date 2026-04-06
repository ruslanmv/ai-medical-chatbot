import OpenAI from "openai";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

const HF_ROUTER_BASE_URL = "https://router.huggingface.co/v1";

function getClient(userToken?: string): OpenAI {
  const apiKey = userToken || process.env.HF_TOKEN;
  if (!apiKey) {
    throw new Error(
      "HuggingFace token missing. Set HF_TOKEN on the server or provide one in Settings."
    );
  }
  return new OpenAI({ apiKey, baseURL: HF_ROUTER_BASE_URL });
}

function buildMessages(messages: ChatMessage[], context?: MedicalContext) {
  const hasSystem = messages.some((m) => m.role === "system");
  if (hasSystem) return messages;
  return [
    { role: "system" as const, content: resolveSystemPrompt(context) },
    ...messages,
  ];
}

export async function chatHF(args: {
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  context?: MedicalContext;
}): Promise<string> {
  const client = getClient(args.apiKey);
  const response = await client.chat.completions.create({
    model: args.model,
    messages: buildMessages(args.messages, args.context) as any,
    temperature: 0.7,
    max_tokens: 1000,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function* streamHF(args: {
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  context?: MedicalContext;
}): AsyncGenerator<string, void, unknown> {
  const client = getClient(args.apiKey);
  const stream = await client.chat.completions.create({
    model: args.model,
    messages: buildMessages(args.messages, args.context) as any,
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

import OpenAI from "openai";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

function getClient(userKey?: string): OpenAI {
  const baseURL = process.env.OLLABRIDGE_URL;
  if (!baseURL) {
    throw new Error(
      "OllaBridge is not configured. Set OLLABRIDGE_URL on the server."
    );
  }
  const apiKey =
    userKey || process.env.OLLABRIDGE_API_KEY || "sk-ollabridge-local";
  return new OpenAI({ apiKey, baseURL: baseURL.replace(/\/+$/, "") + "/v1" });
}

function buildMessages(messages: ChatMessage[], context?: MedicalContext) {
  const hasSystem = messages.some((m) => m.role === "system");
  if (hasSystem) return messages;
  return [
    { role: "system" as const, content: resolveSystemPrompt(context) },
    ...messages,
  ];
}

export async function chatOllaBridge(args: {
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

export async function* streamOllaBridge(args: {
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

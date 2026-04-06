import OpenAI from "openai";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

function getClient(customBaseURL?: string): OpenAI {
  const base =
    customBaseURL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  return new OpenAI({
    apiKey: "ollama", // Ollama ignores the key but SDK requires a non-empty string
    baseURL: base.replace(/\/+$/, "") + "/v1",
  });
}

function buildMessages(messages: ChatMessage[], context?: MedicalContext) {
  const hasSystem = messages.some((m) => m.role === "system");
  if (hasSystem) return messages;
  return [
    { role: "system" as const, content: resolveSystemPrompt(context) },
    ...messages,
  ];
}

export async function chatOllama(args: {
  apiKey?: string; // here apiKey is treated as optional base URL override
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

export async function* streamOllama(args: {
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

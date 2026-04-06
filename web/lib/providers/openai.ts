import OpenAI from "openai";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

type Args = {
  apiKey: string;
  messages: ChatMessage[];
  context?: MedicalContext;
};

function buildMessages(messages: ChatMessage[], context?: MedicalContext) {
  const systemMessage: ChatMessage = {
    role: "system",
    content: resolveSystemPrompt(context),
  };
  return [systemMessage, ...messages];
}

export async function chatOpenAI(args: Args): Promise<string> {
  const client = new OpenAI({ apiKey: args.apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: buildMessages(args.messages, args.context) as any,
    temperature: 0.7,
    max_tokens: 1000,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function* streamOpenAI(
  args: Args,
): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({ apiKey: args.apiKey });
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
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

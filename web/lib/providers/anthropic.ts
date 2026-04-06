import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

type Args = {
  apiKey: string;
  messages: ChatMessage[];
  context?: MedicalContext;
};

function mapMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
}

export async function chatAnthropic(args: Args): Promise<string> {
  const client = new Anthropic({ apiKey: args.apiKey });
  const response = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    system: resolveSystemPrompt(args.context),
    messages: mapMessages(args.messages),
    temperature: 0.7,
  });
  const firstBlock = response.content[0];
  return firstBlock && "text" in firstBlock ? firstBlock.text : "";
}

export async function* streamAnthropic(
  args: Args,
): AsyncGenerator<string, void, unknown> {
  const client = new Anthropic({ apiKey: args.apiKey });
  const stream = await client.messages.stream({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    system: resolveSystemPrompt(args.context),
    messages: mapMessages(args.messages),
    temperature: 0.7,
  });
  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

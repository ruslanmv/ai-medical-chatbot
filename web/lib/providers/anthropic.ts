import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "../types";

const SYSTEM_PROMPT = `You are a caring, professional medical AI assistant. Your role is to:
- Provide helpful, accurate health information
- Ask clarifying questions when needed
- Encourage users to seek professional medical care for serious concerns
- Maintain a warm, empathetic tone
- NEVER provide definitive diagnoses
- Always remind users that you're an AI and cannot replace professional medical advice

Remember: Patient safety is paramount. When in doubt, recommend consulting a healthcare provider.`;

export async function chatAnthropic(args: {
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> {
  const client = new Anthropic({ apiKey: args.apiKey });

  const messages = args.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const response = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: messages,
    temperature: 0.7,
  });

  const firstBlock = response.content[0];
  return firstBlock && "text" in firstBlock ? firstBlock.text : "";
}

export async function* streamAnthropic(args: {
  apiKey: string;
  messages: ChatMessage[];
}): AsyncGenerator<string, void, unknown> {
  const client = new Anthropic({ apiKey: args.apiKey });

  const messages = args.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const stream = await client.messages.stream({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: messages,
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

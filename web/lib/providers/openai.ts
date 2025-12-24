import OpenAI from "openai";
import type { ChatMessage } from "../types";

const SYSTEM_PROMPT = `You are a caring, professional medical AI assistant. Your role is to:
- Provide helpful, accurate health information
- Ask clarifying questions when needed
- Encourage users to seek professional medical care for serious concerns
- Maintain a warm, empathetic tone
- NEVER provide definitive diagnoses
- Always remind users that you're an AI and cannot replace professional medical advice

Remember: Patient safety is paramount. When in doubt, recommend consulting a healthcare provider.`;

export async function chatOpenAI(args: {
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> {
  const client = new OpenAI({ apiKey: args.apiKey });

  const systemMessage: ChatMessage = { role: "system", content: SYSTEM_PROMPT };
  const allMessages = [systemMessage, ...args.messages];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages as any,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function* streamOpenAI(args: {
  apiKey: string;
  messages: ChatMessage[];
}): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({ apiKey: args.apiKey });

  const systemMessage: ChatMessage = { role: "system", content: SYSTEM_PROMPT };
  const allMessages = [systemMessage, ...args.messages];

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages as any,
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

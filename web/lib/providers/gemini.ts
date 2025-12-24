import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "../types";

const SYSTEM_PROMPT = `You are a caring, professional medical AI assistant. Your role is to:
- Provide helpful, accurate health information
- Ask clarifying questions when needed
- Encourage users to seek professional medical care for serious concerns
- Maintain a warm, empathetic tone
- NEVER provide definitive diagnoses
- Always remind users that you're an AI and cannot replace professional medical advice

Remember: Patient safety is paramount. When in doubt, recommend consulting a healthcare provider.`;

function formatMessagesForGemini(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "MODEL" : "USER";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}

export async function chatGemini(args: {
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(args.apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = formatMessagesForGemini(args.messages);
  const result = await model.generateContent(prompt);

  return result.response.text();
}

export async function* streamGemini(args: {
  apiKey: string;
  messages: ChatMessage[];
}): AsyncGenerator<string, void, unknown> {
  const genAI = new GoogleGenerativeAI(args.apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = formatMessagesForGemini(args.messages);
  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

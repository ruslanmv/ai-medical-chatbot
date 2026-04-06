import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "../types";
import { resolveSystemPrompt, type MedicalContext } from "./system-prompt";

type Args = {
  apiKey: string;
  messages: ChatMessage[];
  context?: MedicalContext;
};

function formatMessagesForGemini(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "MODEL" : "USER";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}

export async function chatGemini(args: Args): Promise<string> {
  const genAI = new GoogleGenerativeAI(args.apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: resolveSystemPrompt(args.context),
  });
  const result = await model.generateContent(
    formatMessagesForGemini(args.messages),
  );
  return result.response.text();
}

export async function* streamGemini(
  args: Args,
): AsyncGenerator<string, void, unknown> {
  const genAI = new GoogleGenerativeAI(args.apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: resolveSystemPrompt(args.context),
  });
  const result = await model.generateContentStream(
    formatMessagesForGemini(args.messages),
  );
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

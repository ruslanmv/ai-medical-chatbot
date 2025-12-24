import { chatOpenAI, streamOpenAI } from "./openai";
import { chatGemini, streamGemini } from "./gemini";
import { chatAnthropic, streamAnthropic } from "./anthropic";
import type { Provider, ChatMessage } from "../types";

export async function chatWithProvider(args: {
  provider: Provider;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> {
  switch (args.provider) {
    case "openai":
      return chatOpenAI(args);
    case "gemini":
      return chatGemini(args);
    case "claude":
      return chatAnthropic(args);
    case "ollama":
      // Ollama would use local endpoint
      throw new Error("Ollama non-streaming not implemented yet");
    case "watsonx":
      throw new Error("Watson X not implemented yet");
    default:
      throw new Error(`Unknown provider: ${args.provider}`);
  }
}

export async function* streamWithProvider(args: {
  provider: Provider;
  apiKey: string;
  messages: ChatMessage[];
}): AsyncGenerator<string, void, unknown> {
  switch (args.provider) {
    case "openai":
      yield* streamOpenAI(args);
      break;
    case "gemini":
      yield* streamGemini(args);
      break;
    case "claude":
      yield* streamAnthropic(args);
      break;
    case "ollama":
      throw new Error("Ollama streaming not implemented yet");
    case "watsonx":
      throw new Error("Watson X streaming not implemented yet");
    default:
      throw new Error(`Unknown provider: ${args.provider}`);
  }
}

// Verify API key is valid
export async function verifyConnection(args: {
  provider: Provider;
  apiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const testMessage: ChatMessage = {
      role: "user",
      content: "Hi",
    };

    await chatWithProvider({
      provider: args.provider,
      apiKey: args.apiKey,
      messages: [testMessage],
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Connection failed",
    };
  }
}

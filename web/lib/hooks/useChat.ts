"use client";

import { useState, useCallback } from "react";
import type { Provider, Preset } from "../types";
import { buildPatientContext } from "../health-store";

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
};

export type SendOptions = {
  preset?: Preset;
  provider?: Provider;
  model?: string;
  apiKey?: string;
  userHfToken?: string;
  context?: {
    country: string;
    language: string;
    emergencyNumber: string;
    units?: "metric" | "imperial";
  };
};

/**
 * Providers that require the user to supply credentials client-side.
 * Free presets route via the server's HF_TOKEN, so no key is needed.
 */
const BYO_KEY_PROVIDERS: Provider[] = ["openai", "gemini", "claude"];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "ai",
      content:
        "Hello! I'm your medical AI assistant. I'm here to help answer health questions and provide guidance. How can I assist you today?\n\n*Please note: I'm an AI and cannot replace professional medical advice. For emergencies, please call 911 or visit your nearest emergency room.*",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, options: SendOptions) => {
      if (!content.trim()) return;

      // Only require an API key for BYO providers used directly (no preset).
      if (
        !options.preset &&
        options.provider &&
        BYO_KEY_PROVIDERS.includes(options.provider) &&
        !options.apiKey?.trim()
      ) {
        setError("Please add an API key in Settings first.");
        return;
      }

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: content.trim(),
        timestamp,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      setError(null);

      try {
        const response = await fetch("/api/proxy/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preset: options.preset,
            provider: options.provider,
            model: options.model,
            apiKey: options.apiKey,
            userHfToken: options.userHfToken,
            context: options.context,
            messages: [...messages, userMessage].map((m, i) => ({
              role: m.role === "ai" ? "assistant" : "user",
              // Inject patient context only on the FIRST user message of
              // the conversation — keeps it concise and avoids bloating
              // every turn with repeated profile data.
              content:
                i === 0 && m.role === "user"
                  ? m.content + buildPatientContext()
                  : m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiContent = "";
        const aiMessageId = Date.now() + 1;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.content) {
                  aiContent += parsed.content;
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === aiMessageId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === aiMessageId ? { ...m, content: aiContent } : m,
                      );
                    }
                    return [
                      ...prev,
                      {
                        id: aiMessageId,
                        role: "ai" as const,
                        content: aiContent,
                        timestamp: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      },
                    ];
                  });
                }
              } catch {
                // ignore parse errors on keep-alive / partial frames
              }
            }
          }
        }
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to send message";
        setError(errorMessage);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            role: "ai",
            content: `⚠️ Error: ${errorMessage}\n\nPlease check your settings and try again.`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 1,
        role: "ai",
        content:
          "Hello! I'm your medical AI assistant. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setError(null);
  }, []);

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearMessages,
  };
}

"use client";

import { useState, useCallback } from "react";
import type { Provider } from "../types";

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
};

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
    async (content: string, provider: Provider, apiKey: string) => {
      if (!content.trim()) return;

      if (!apiKey.trim()) {
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
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read the stream
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

              if (data === "[DONE]") {
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                if (parsed.content) {
                  aiContent += parsed.content;

                  // Update the AI message in real-time
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === aiMessageId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === aiMessageId
                          ? { ...m, content: aiContent }
                          : m
                      );
                    } else {
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
                    }
                  });
                }
              } catch (e) {
                // Ignore JSON parse errors
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
            content: `⚠️ Error: ${errorMessage}\n\nPlease check your API key and try again.`,
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
    [messages]
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

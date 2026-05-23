"use client";

import { useState, useCallback } from "react";
import type { Provider, Preset } from "../types";
import { buildPatientContext, buildMedicineInventoryContext, buildContactsContext } from "../health-store";

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
  // Start with NO canned greeting. The empty-state hero in ChatView
  // already shows the welcome card ("ask_hero_title" / subtitle /
  // TrustBar). A hardcoded "Hello! I'm your medical AI assistant…"
  // bubble was reading as a generic AI script and clashed with the
  // "professional, real-time" voice the rest of the product is going
  // for. The first message in the thread will be the user's question;
  // the first AI message will be the actual LLM reply.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        // 58-second timeout. The Vercel proxy has its own 50s abort
        // (with a friendlier 504 "Backend is waking up" payload) and
        // Vercel's hard function cap is 60s. Setting the client to 58s
        // gives the proxy 8s of headroom to surface its actionable
        // message before the client aborts with a generic
        // "Response took too long". The old 45s cap was racing the
        // proxy and showing the worse error.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 58000);

        const response = await fetch("/api/proxy/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
                  ? m.content + buildPatientContext() + buildMedicineInventoryContext() + buildContactsContext()
                  : m.content,
            })),
          }),
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiContent = "";
        let buffer = "";
        const aiMessageId = Date.now() + 1;
        let firstByteAt: number | null = null;
        const requestStartedAt = Date.now();

        // The assistant bubble is created LAZILY — only after the first real
        // token arrives. While the stream is still flowing nothing is shown
        // but the typing indicator (handled by the caller via isTyping). This
        // keeps the Ask view clean: no empty MedOS card sitting above the
        // typing dots during streaming.

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // SSE frames can be split across chunks — buffer until we see a
          // double-newline separator before parsing.
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";

          for (const frame of frames) {
            for (const line of frame.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data) continue;
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);

                // Backend providers emit the OpenAI-compatible shape:
                //   { choices: [{ delta: { content: "..." } }], provider, model }
                // We also accept a legacy top-level `content` field so old
                // responses still render.
                const chunkContent =
                  parsed?.choices?.[0]?.delta?.content ??
                  parsed?.content ??
                  "";

                if (chunkContent) {
                  if (firstByteAt === null) {
                    firstByteAt = Date.now();
                    if (typeof console !== "undefined") {
                      console.info(
                        `[Chat] First token received in ${firstByteAt - requestStartedAt}ms` +
                          (parsed?.provider ? ` via ${parsed.provider}` : "") +
                          (parsed?.model ? ` (${parsed.model})` : ""),
                      );
                    }
                  }
                  aiContent += chunkContent;
                  setMessages((prev) => {
                    // First token: create the bubble. Subsequent tokens:
                    // update its content in place.
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
              } catch (parseErr) {
                // Malformed frame — log once at info level so dev console
                // can trace SSE issues without spamming for keep-alives.
                if (typeof console !== "undefined") {
                  console.debug("[Chat] Skipped SSE frame:", data.slice(0, 120));
                }
              }
            }
          }
        }

        // If the stream closed with zero content, surface it as an error
        // so the user isn't left staring at an empty bubble.
        if (!aiContent) {
          throw new Error(
            "The AI returned an empty response. Check Admin → LLM for provider health.",
          );
        }
      } catch (err: any) {
        const errorMessage =
          err?.name === "AbortError"
            ? "The medical AI is taking longer than usual to respond. Please try again in a moment."
            : err?.message || "I'm having trouble reaching the medical AI right now.";
        setError(errorMessage);
        if (typeof console !== "undefined") {
          console.error("[Chat] Stream failed:", errorMessage, err);
        }

        // Render a gentle, professional message — no "⚠️ Error:" prefix
        // and no "check your settings" trailer (the user almost never
        // can fix backend availability from settings). The message is
        // delivered as the assistant turn so the thread reads
        // naturally; the user can retry by sending again.
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            role: "ai",
            content: errorMessage,
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
    // Reset to an empty thread — the empty-state hero in ChatView
    // re-renders ("ask_hero_title" + TrustBar) the moment messages
    // is empty.
    setMessages([]);
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

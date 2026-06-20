"use client";

import { useState, useCallback } from "react";
import type { Provider, Preset } from "../types";
import { buildPatientContext, buildMedicineInventoryContext } from "../health-store";

/** A retrieved source surfaced as an evidence chip on an AI answer.
 *  Mirrors the `sources` array the chat route emits in its SSE metadata
 *  (lib/rag/types.ts → EvidenceSource), trimmed to what the UI renders. */
export interface ChatSource {
  ref?: string;
  title: string;
  organization: string;
  url: string;
  version_date?: string;
}

export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  /** Evidence-receipt sources (grounded answers only). */
  sources?: ChatSource[];
  /** 0–1 faithfulness score when the check ran, else null/undefined. */
  groundedness?: number | null;
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
  /**
   * Start a brand-new conversation for this turn: the prior in-memory
   * thread is discarded from BOTH the rendered UI and the request
   * payload, so the message becomes the first turn of a fresh session.
   *
   * Set when a message is initiated from a non-chat surface (the Home
   * landing input, a Topics card, ...). Without it, returning to Home
   * after a chat and typing a new prompt appended the new topic onto the
   * previous thread — the server even received the stale history because
   * the payload is built from the closure's `messages` (see below).
   */
  freshSession?: boolean;
};

/**
 * Providers that require the user to supply credentials client-side.
 * Free presets route via the server's HF_TOKEN, so no key is needed.
 */
const BYO_KEY_PROVIDERS: Provider[] = ["openai", "gemini", "claude"];

export function useChat() {
  // Start the thread empty — see web/lib/hooks/useChat.ts for the
  // rationale (canned-greeting bubble removed for a more real-time
  // voice).
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

      // A fresh session discards the previous thread entirely; otherwise
      // the new turn appends to the existing conversation. Capture the
      // base history HERE rather than reading the closure's `messages`
      // inside the request body, so the rendered messages and the payload
      // sent to /api/chat stay in lock-step (this is the fix for "typing
      // from Home appended to the old chat — and the server saw the stale
      // history too").
      const baseHistory = options.freshSession ? [] : messages;

      setMessages(
        options.freshSession ? [userMessage] : (prev) => [...prev, userMessage],
      );
      setIsTyping(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preset: options.preset,
            provider: options.provider,
            model: options.model,
            apiKey: options.apiKey,
            userHfToken: options.userHfToken,
            context: options.context,
            messages: [...baseHistory, userMessage].map((m, i) => ({
              role: m.role === "ai" ? "assistant" : "user",
              // Inject patient context only on the FIRST user message of
              // the conversation — keeps it concise and avoids bloating
              // every turn with repeated profile data.
              content:
                i === 0 && m.role === "user"
                  ? m.content + buildPatientContext() + buildMedicineInventoryContext()
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
        // Evidence-receipt metadata arrives on the same SSE frame as the
        // (buffered) answer content for grounded turns.
        let aiSources: ChatSource[] | undefined;
        let aiGroundedness: number | null | undefined;
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
                // Capture evidence-receipt metadata when present.
                if (Array.isArray(parsed.sources)) {
                  aiSources = parsed.sources as ChatSource[];
                }
                if (typeof parsed.groundedness === "number") {
                  aiGroundedness = parsed.groundedness;
                }
                // Extract content from THREE possible chunk shapes (in
                // priority order):
                //   1. OpenAI-style stream:  { choices: [{ delta: { content }}]}
                //      ← every card emitter (streamCardChunk) and the
                //      ← post-LLM-filtered single-chunk reply use this.
                //   2. OpenAI non-stream:    { choices: [{ message: { content }}]}
                //   3. Legacy MedOS:         { content: "..." }
                //
                // The HF Space client previously only checked #3, which
                // meant every server chunk (all OpenAI-shaped) was
                // silently dropped — aiContent stayed empty and the UI
                // showed nothing. Logs showed 200/ok at the API level
                // because the failure was 100% on the parse side.
                const piece =
                  (parsed.choices?.[0]?.delta?.content) ||
                  (parsed.choices?.[0]?.message?.content) ||
                  parsed.content ||
                  "";
                if (piece) {
                  aiContent += piece;
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === aiMessageId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === aiMessageId
                          ? {
                              ...m,
                              content: aiContent,
                              sources: aiSources ?? m.sources,
                              groundedness: aiGroundedness ?? m.groundedness,
                            }
                          : m,
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
                        sources: aiSources,
                        groundedness: aiGroundedness,
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
        const errorMessage =
          err?.message || "I'm having trouble reaching the medical AI right now.";
        setError(errorMessage);

        // Gentle, professional inline message — no "⚠️ Error:" prefix,
        // no "check your settings" trailer (the user almost never can
        // fix backend availability from settings).
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

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

/**
 * Typed action event — the structured alternative to a free-text user
 * message. Card buttons emit one of these instead of sending the label
 * as raw text; the AI-first SFT prompt teaches the model to recognise
 * `<action type="..."/>` blocks in the user turn and dispatch
 * accordingly (e.g. doctor_summary → emit doctor_summary card from the
 * prior structured turns, never restart the symptom flow).
 *
 * Wire shape — sent to /api/chat alongside `messages` as a top-level
 * field so a forward-rolling backend can route on it directly:
 *
 *   { messages: [...], action: { type: "doctor_summary" } }
 *
 * For the current backend (which only knows about `messages`), the
 * action is also serialised into the user turn as an `<action ... />`
 * block so the LLM sees it inline. Once the HF Space wrapper adds an
 * `action` handler, the duplicate serialisation can be removed.
 */
export type MedActionEvent =
  | { type: "doctor_summary" }
  | { type: "find_nearby_care" }
  | { type: "add_health_profile" }
  | { type: "ask_another_question" }
  | { type: "select"; value: string; label: string }
  | { type: "emergency" };

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
  /** When set, this is what the user sees in their bubble, while `content`
   *  is what the backend LLM receives. Used for card-triggered actions
   *  (e.g. "Create doctor summary" button → sends an explicit instruction
   *  to the model but the chat still reads as the user's choice). */
  displayContent?: string;
  /** Typed action event for card-button clicks. When set, the request
   *  carries an `action` field at the top level AND embeds an
   *  `<action type="..."/>` block in the user-turn text so the model
   *  routes deterministically instead of treating the click as a new
   *  symptom mention. */
  action?: MedActionEvent;
};

/**
 * Providers that require the user to supply credentials client-side.
 * Free presets route via the server's HF_TOKEN, so no key is needed.
 */
const BYO_KEY_PROVIDERS: Provider[] = ["openai", "gemini", "claude"];

/** Serialise a typed action event into the `<action type="..."/>` tag
 *  the AI-first system prompt expects to see inside the user turn. The
 *  tag is the in-band channel; the request body's top-level `action`
 *  field is the out-of-band one. Either is enough — both makes the
 *  rollout boundary trivial. */
function serializeActionTag(a: MedActionEvent): string {
  if (a.type === "select") {
    // Escape minimally — values are constrained to identifiers like
    // "rf:cardio:radiation", but defensively strip any quote chars.
    const v = a.value.replace(/"/g, "");
    const l = a.label.replace(/"/g, "");
    return `<action type="select" value="${v}" label="${l}"/>`;
  }
  return `<action type="${a.type}"/>`;
}

/** Pull the current flow's topic out of the chat history by inspecting
 *  the most recent assistant card with a `title` field (safety_check,
 *  intake, guidance, next_steps). Returns null if the conversation is
 *  cold or the assistant turn contained only a greeting / context
 *  switch. The backend uses this hint to decide whether the new user
 *  turn is a context switch — see the SYSTEM_PROMPT contract. */
function extractActiveTopic(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "ai") continue;
    // Walk every `[card:KIND] {...} [/card]` in reverse so the most
    // recent topic-bearing card wins.
    const matches = Array.from(
      m.content.matchAll(/\[card:([a-z_]+)\]\s*(\{[\s\S]*?\})\s*\[\/card\]/gi),
    );
    for (let k = matches.length - 1; k >= 0; k--) {
      const kind = matches[k][1];
      if (
        kind !== "safety_check" &&
        kind !== "intake" &&
        kind !== "guidance" &&
        kind !== "next_steps"
      ) {
        continue;
      }
      try {
        const obj = JSON.parse(matches[k][2]);
        if (obj && typeof obj.title === "string" && obj.title.trim()) {
          return obj.title.trim();
        }
      } catch {
        // ignore — malformed payload, keep searching
      }
    }
  }
  return null;
}

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

      const trimmed = content.trim();
      const display = (options.displayContent ?? content).trim();

      // Serialise the typed action (if any) into an `<action/>` block
      // prepended to the user-turn text. The new AI-first SFT system
      // prompt teaches the model to dispatch on this tag deterministically
      // (e.g. <action type="doctor_summary"/> → emit doctor_summary card,
      // NEVER restart the symptom flow). It's belt-and-braces with the
      // top-level `action` field below so the channel works on both the
      // current backend and a future backend that consumes the structured
      // event directly.
      const actionTag = options.action
        ? serializeActionTag(options.action) + "\n"
        : "";
      const wireText = actionTag + trimmed;

      // What we show in the chat thread (user-facing bubble).
      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: display,
        timestamp,
      };
      // What we send to the LLM. Equal to `userMessage` unless an action
      // was attached or `displayContent` was overridden.
      const wireMessage: ChatMessage =
        wireText === display ? userMessage : { ...userMessage, content: wireText };

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

        const response = await fetch("/api/chat", {
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
            // Top-level typed action — the AI-first protocol surface.
            // A forward-rolling backend can route on this directly
            // without parsing the embedded <action/> tag. Today's
            // backend ignores unknown fields, so the tag still does
            // the work via the SFT-trained dispatch contract.
            action: options.action,
            // Flow-state hints. Sent so a forward-rolling backend can
            // detect context switches deterministically (combined with
            // the model's own classification) instead of re-scanning
            // the entire history each turn. `active_topic` is the last
            // assistant-card title; the model is taught (via the new
            // SYSTEM_PROMPT) to emit a context_switch card when the
            // new user turn diverges from it.
            flow: {
              active_topic: extractActiveTopic(messages),
            },
            messages: [...messages, wireMessage].map((m, i) => ({
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

"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Send, Mic, MicOff, Sparkles } from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface HeroInputProps {
  language: SupportedLanguage;
  onSend: (value: string) => void;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  voiceEnabled?: boolean;
  isListening?: boolean;
  /** Dynamic suggestion chips rendered under the input (empty = hide). */
  suggestions?: string[];
  /** Variant — the home hero uses a larger, more prominent size. */
  size?: "default" | "hero";
  /** Autofocus on mount (chat view). */
  autoFocus?: boolean;
}

/**
 * The single most important element of the app: the input.
 * - Large, generous rounded container with a soft brand glow on focus.
 * - Rotating empathetic placeholders so the field never feels empty.
 * - Multi-line textarea that auto-grows up to 5 rows.
 * - Inline primary send button + optional voice mic.
 * - Suggestion chips appear below for zero-friction entry.
 */
export function HeroInput({
  language,
  onSend,
  onStartVoice,
  onStopVoice,
  voiceEnabled = true,
  isListening = false,
  suggestions = [],
  size = "default",
  autoFocus = false,
}: HeroInputProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Rotating empathetic placeholders.
  const rotating = useMemo(
    () => [
      t("ask_placeholder_rotate_1", language),
      t("ask_placeholder_rotate_2", language),
      t("ask_placeholder_rotate_3", language),
      t("ask_placeholder_rotate_4", language),
      t("ask_placeholder_rotate_5", language),
    ],
    [language],
  );
  const [rotIdx, setRotIdx] = useState(0);
  useEffect(() => {
    if (value) return; // freeze rotation while the user is typing
    const id = setInterval(() => setRotIdx((i) => (i + 1) % rotating.length), 3200);
    return () => clearInterval(id);
  }, [value, rotating.length]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const max = size === "hero" ? 180 : 160;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value, size]);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSend(v);
    setValue("");
  };

  const isHero = size === "hero";

  return (
    <div className="w-full">
      {/* The glowing container */}
      <div
        className={`relative group rounded-[28px] bg-surface-1 border border-line/70 shadow-card transition-all focus-within:border-brand-500/60 focus-within:shadow-glow ${
          isHero ? "p-2.5" : "p-2"
        }`}
      >
        {/* Soft gradient halo behind the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px -z-10 rounded-[28px] bg-brand-gradient opacity-0 group-focus-within:opacity-40 blur-xl transition-opacity"
        />

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={taRef}
              rows={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              placeholder={rotating[rotIdx]}
              className={`w-full resize-none bg-transparent text-ink-base placeholder:text-ink-subtle outline-none leading-relaxed px-4 py-3 ${
                isHero ? "text-lg" : "text-base"
              }`}
              aria-label={t("ask_placeholder", language)}
            />
          </div>

          {/* Voice */}
          {voiceEnabled && (
            <button
              type="button"
              onClick={isListening ? onStopVoice : onStartVoice}
              aria-label={t("ask_tap_speak", language)}
              className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                isHero ? "w-11 h-11" : "w-10 h-10"
              } ${
                isListening
                  ? "bg-danger-500 text-white animate-pulse shadow-danger-glow"
                  : "bg-surface-2 text-ink-muted hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
              }`}
            >
              {isListening ? <MicOff size={isHero ? 18 : 16} /> : <Mic size={isHero ? 18 : 16} />}
            </button>
          )}

          {/* Send — always present, brand gradient when there's text */}
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send"
            className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
              isHero ? "w-12 h-12" : "w-10 h-10"
            } ${
              value.trim()
                ? "bg-brand-gradient text-white shadow-glow hover:brightness-110"
                : "bg-surface-2 text-ink-subtle cursor-not-allowed"
            }`}
          >
            <Send size={isHero ? 20 : 16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Suggestion chips — dynamic, click to send */}
      {suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            <Sparkles size={12} className="text-accent-500" />
            {t("ask_suggestions", language)}
          </span>
          {suggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              onClick={() => onSend(s)}
              className="px-3.5 py-1.5 rounded-full bg-surface-1 border border-line/70 text-sm text-ink-muted hover:text-brand-600 hover:border-brand-500/50 hover:bg-brand-50/60 dark:hover:bg-brand-900/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

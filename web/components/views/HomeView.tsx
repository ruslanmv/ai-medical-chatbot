"use client";

import { HeroInput } from "../chat/HeroInput";
import {
  t,
  type SupportedLanguage,
} from "@/lib/i18n";

interface HomeViewProps {
  language: SupportedLanguage;
  country: string;
  emergencyNumber: string;
  onNavigate: (view: string) => void;
  onSendMessage: (content: string) => void;
  onStartVoice: () => void;
}

/**
 * Home landing — chat-first, enterprise-clean, zero noise.
 *
 * Structure (ChatGPT / Ada Health pattern):
 *   1. Empathetic headline (one line)
 *   2. Subtitle (one line)
 *   3. The input (THE hero element)
 *   4. Suggestion chips
 *   5. One-line disclaimer (subtle)
 *
 * NO trust badges, NO action cards, NO marketing copy.
 * Trust is communicated through design quality, not text.
 */
export function HomeView({
  language,
  onSendMessage,
  onStartVoice,
}: HomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scroll-touch flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero — short, empathetic, centered */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-base tracking-tight leading-tight mb-2">
            {t("home_hero_title", language)}
          </h1>
          <p className="text-ink-muted text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
            {t("home_hero_subtitle", language)}
          </p>
        </div>

        {/* The input — THE hero */}
        <div className="mb-6">
          <HeroInput
            language={language}
            onSend={onSendMessage}
            onStartVoice={onStartVoice}
            size="hero"
            suggestions={[
              t("ask_example_1", language),
              t("ask_example_2", language),
              t("ask_example_3", language),
            ].filter(Boolean)}
          />
        </div>

        {/* One subtle line — not a banner, not a wall of text */}
        <p className="text-center text-[11px] text-ink-subtle">
          {t("badge_not_doctor", language)}
        </p>
      </div>
    </div>
  );
}

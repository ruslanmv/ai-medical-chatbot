"use client";

import { Stethoscope, Pill, Baby } from "lucide-react";
import { HeroInput } from "../chat/HeroInput";
import { TrustBar } from "../chat/TrustBar";
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
 * Home landing — enterprise-clean, zero redundancy.
 *
 * Structure:
 *   1. Empathetic hero headline
 *   2. The input (the single most important element)
 *   3. Trust bar (one line)
 *   4. Three action cards (symptoms / medicine / pregnancy)
 *   5. Disclaimer (one line)
 *
 * Everything else (emergency, voice, topics, settings) lives in the
 * sidebar, bottom nav, or header — NOT repeated here.
 */
export function HomeView({
  language,
  onSendMessage,
  onStartVoice,
}: HomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero — short, empathetic, centered */}
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-base tracking-tight leading-tight mb-2">
            {t("home_hero_title", language)}
          </h1>
          <p className="text-ink-muted text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            {t("home_hero_subtitle", language)}
          </p>
        </div>

        {/* The input — front and center, hero size */}
        <div className="mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
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

        {/* Trust bar — one line, not repeated */}
        <div className="mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <TrustBar language={language} compact />
        </div>

        {/* Three action cards — no redundancy with nav */}
        <div className="grid sm:grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <ActionCard
            title={t("home_symptoms", language)}
            Icon={Stethoscope}
            iconClass="bg-rose-500/10 text-rose-500"
            onClick={() => onSendMessage(t("home_symptoms", language))}
          />
          <ActionCard
            title={t("home_medicine", language)}
            Icon={Pill}
            iconClass="bg-brand-500/10 text-brand-500"
            onClick={() => onSendMessage(t("home_medicine", language))}
          />
          <ActionCard
            title={t("home_pregnancy", language)}
            Icon={Baby}
            iconClass="bg-purple-500/10 text-purple-500"
            onClick={() => onSendMessage(t("home_pregnancy", language))}
          />
        </div>

        {/* Disclaimer — one line, bottom */}
        <p className="text-center text-[11px] text-ink-subtle mt-8">
          {t("badge_not_doctor", language)}
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  Icon,
  iconClass,
  onClick,
}: {
  title: string;
  Icon: any;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-2xl bg-surface-1/90 border border-line/60 shadow-soft hover:shadow-card hover:-translate-y-0.5 hover:border-brand-500/40 transition-all text-center group"
    >
      <div
        className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${iconClass}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="font-semibold text-ink-base text-sm block tracking-tight">
        {title}
      </span>
    </button>
  );
}

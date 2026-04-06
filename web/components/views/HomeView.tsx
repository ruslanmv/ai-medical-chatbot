"use client";

import {
  Stethoscope,
  Pill,
  Baby,
  AlertTriangle,
  Mic,
  Heart,
  ChevronRight,
} from "lucide-react";
import { HeroInput } from "../chat/HeroInput";
import { TrustBar } from "../chat/TrustBar";
import {
  t,
  LANGUAGE_NAMES,
  getCountryName,
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

const QUICK_TOPICS_KEYS = [
  "topic_fever",
  "topic_cough",
  "topic_headache",
  "topic_blood_pressure",
  "topic_diabetes",
  "topic_pregnancy",
  "topic_mental_health",
];

export function HomeView({
  language,
  country,
  emergencyNumber,
  onNavigate,
  onSendMessage,
  onStartVoice,
}: HomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-32">
        {/* Region chip */}
        <div className="flex justify-center mb-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-1/80 backdrop-blur border border-line/60 rounded-full text-xs font-semibold text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            {LANGUAGE_NAMES[language]} · {getCountryName(country)}
          </div>
        </div>

        {/* Hero — empathetic headline */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-gradient mb-5 shadow-glow">
            <Heart size={30} className="text-white" strokeWidth={2.25} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-500 mb-3">
            {t("home_hero_eyebrow", language)}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-base tracking-tight leading-tight mb-3">
            {t("home_hero_title", language)}
          </h1>
          <p className="text-ink-muted text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            {t("home_hero_subtitle", language)}
          </p>
        </div>

        {/* The hero input — inline, front-and-center */}
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
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

        {/* Trust bar */}
        <div className="mt-6 mb-10 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <TrustBar language={language} />
        </div>

        {/* Primary action cards */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <ActionCard
            title={t("home_symptoms", language)}
            description={t("home_symptoms_desc", language)}
            Icon={Stethoscope}
            iconClass="bg-rose-500/10 text-rose-500"
            onClick={() => onSendMessage(t("home_symptoms", language))}
          />
          <ActionCard
            title={t("home_medicine", language)}
            description={t("home_medicine_desc", language)}
            Icon={Pill}
            iconClass="bg-brand-500/10 text-brand-500"
            onClick={() => onSendMessage(t("home_medicine", language))}
          />
          <ActionCard
            title={t("home_pregnancy", language)}
            description={t("home_pregnancy_desc", language)}
            Icon={Baby}
            iconClass="bg-purple-500/10 text-purple-500"
            onClick={() => onSendMessage(t("home_pregnancy", language))}
          />
          <ActionCard
            title={t("home_voice", language)}
            description={t("home_voice_desc", language)}
            Icon={Mic}
            iconClass="bg-accent-500/15 text-accent-500"
            onClick={onStartVoice}
          />
        </div>

        {/* Emergency card — distinct, high-contrast */}
        <button
          onClick={() => onNavigate("emergency")}
          className="w-full p-5 rounded-2xl border border-danger-500/40 bg-danger-500/8 hover:bg-danger-500/12 transition-all text-left flex items-center gap-4 mb-8 group"
        >
          <div className="w-12 h-12 rounded-xl bg-danger-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-danger-500/25 transition-colors">
            <AlertTriangle size={24} className="text-danger-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-ink-base text-base block">
              {t("home_emergency", language)}
            </span>
            <span className="text-sm text-ink-muted block mt-0.5">
              {t("home_emergency_desc", language)}
            </span>
          </div>
          <span className="font-black text-danger-500 text-base flex-shrink-0">
            {emergencyNumber}
          </span>
        </button>

        {/* Quick topic chips */}
        <div className="mb-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-subtle mb-3">
            {t("home_quick_topics", language)}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_TOPICS_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => onSendMessage(t(key, language))}
                className="px-4 py-2 rounded-full bg-surface-1/80 border border-line/60 text-sm font-medium text-ink-muted hover:text-brand-600 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-all"
              >
                {t(key, language)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-subtle">
          {t("badge_not_doctor", language)}
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  Icon,
  iconClass,
  onClick,
}: {
  title: string;
  description: string;
  Icon: any;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-5 rounded-2xl bg-surface-1/90 backdrop-blur border border-line/60 shadow-soft hover:shadow-card hover:-translate-y-0.5 hover:border-brand-500/40 transition-all text-left flex items-center gap-4 group"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${iconClass}`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-ink-base text-[15px] block tracking-tight">
          {title}
        </span>
        <span className="text-[13px] text-ink-muted block mt-0.5 leading-snug">
          {description}
        </span>
      </div>
      <ChevronRight size={18} className="text-ink-subtle flex-shrink-0 group-hover:text-brand-500 transition-colors" />
    </button>
  );
}

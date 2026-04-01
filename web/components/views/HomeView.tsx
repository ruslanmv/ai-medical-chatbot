"use client";

import {
  Stethoscope,
  Pill,
  Baby,
  AlertTriangle,
  Mic,
  Shield,
  Heart,
  ChevronRight,
} from "lucide-react";
import { t, LANGUAGE_NAMES, getCountryName, type SupportedLanguage } from "@/lib/i18n";

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
      <div className="max-w-2xl mx-auto p-6 pb-32">
        {/* Top area: language chip + trust badges */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-sm font-medium text-blue-700 border border-blue-100">
            {LANGUAGE_NAMES[language]} &bull; {getCountryName(country)}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Shield size={12} className="text-emerald-500" />
              {t("badge_private", language)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Shield size={12} className="text-emerald-500" />
              {t("badge_no_signup", language)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Shield size={12} className="text-emerald-500" />
              {t("badge_free", language)}
            </span>
          </div>
        </div>

        {/* Main headline */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            {t("home_headline", language)}
          </h1>
          <p className="text-slate-500 text-base">
            {t("home_subheadline", language)}
          </p>
        </div>

        {/* Primary action cards */}
        <div className="space-y-3 mb-8">
          {/* Symptoms */}
          <button
            onClick={() => onSendMessage(t("home_symptoms", language))}
            className="w-full p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
              <Stethoscope size={24} className="text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-800 text-base block">
                {t("home_symptoms", language)}
              </span>
              <span className="text-sm text-slate-500 block mt-0.5">
                {t("home_symptoms_desc", language)}
              </span>
            </div>
            <ChevronRight size={20} className="text-slate-300 flex-shrink-0" />
          </button>

          {/* Medicine */}
          <button
            onClick={() => onSendMessage(t("home_medicine", language))}
            className="w-full p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <Pill size={24} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-800 text-base block">
                {t("home_medicine", language)}
              </span>
              <span className="text-sm text-slate-500 block mt-0.5">
                {t("home_medicine_desc", language)}
              </span>
            </div>
            <ChevronRight size={20} className="text-slate-300 flex-shrink-0" />
          </button>

          {/* Pregnancy & child */}
          <button
            onClick={() => onSendMessage(t("home_pregnancy", language))}
            className="w-full p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
              <Baby size={24} className="text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-800 text-base block">
                {t("home_pregnancy", language)}
              </span>
              <span className="text-sm text-slate-500 block mt-0.5">
                {t("home_pregnancy_desc", language)}
              </span>
            </div>
            <ChevronRight size={20} className="text-slate-300 flex-shrink-0" />
          </button>

          {/* Emergency */}
          <button
            onClick={() => onNavigate("emergency")}
            className="w-full p-5 bg-red-50 rounded-2xl border-2 border-red-200 shadow-sm hover:shadow-md hover:bg-red-100 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-800 text-base block">
                {t("home_emergency", language)}
              </span>
              <span className="text-sm text-red-600 block mt-0.5">
                {t("home_emergency_desc", language)}
              </span>
            </div>
            <span className="text-red-700 font-bold text-sm flex-shrink-0">
              {emergencyNumber}
            </span>
          </button>

          {/* Voice / Speak */}
          <button
            onClick={onStartVoice}
            className="w-full p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200">
              <Mic size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-800 text-base block">
                {t("home_voice", language)}
              </span>
              <span className="text-sm text-slate-500 block mt-0.5">
                {t("home_voice_desc", language)}
              </span>
            </div>
          </button>
        </div>

        {/* Quick topic chips */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_TOPICS_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => onSendMessage(t(key, language))}
                className="px-4 py-2 bg-white rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
              >
                {t(key, language)}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400">
          {t("badge_not_doctor", language)}
        </p>
      </div>
    </div>
  );
}

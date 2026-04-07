"use client";

import {
  Thermometer,
  Wind,
  Brain,
  Heart,
  Baby,
  Stethoscope,
  Activity,
  Droplets,
  Sun,
  Frown,
} from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface TopicsViewProps {
  language: SupportedLanguage;
  onSelectTopic: (topic: string) => void;
}

const TOPICS = [
  { key: "topic_fever", icon: Thermometer, color: "amber" },
  { key: "topic_cough", icon: Wind, color: "blue" },
  { key: "topic_headache", icon: Brain, color: "purple" },
  { key: "topic_blood_pressure", icon: Activity, color: "rose" },
  { key: "topic_diabetes", icon: Droplets, color: "indigo" },
  { key: "topic_pregnancy", icon: Baby, color: "pink" },
  { key: "topic_mental_health", icon: Frown, color: "teal" },
  { key: "topic_diarrhea", icon: Stethoscope, color: "emerald" },
  { key: "topic_hypertension", icon: Heart, color: "red" },
  { key: "topic_children", icon: Baby, color: "sky" },
  { key: "topic_malaria", icon: Sun, color: "orange" },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string }> = {
  amber: { bg: "bg-amber-50", icon: "text-amber-500", border: "border-amber-200" },
  blue: { bg: "bg-blue-50", icon: "text-blue-500", border: "border-blue-200" },
  purple: { bg: "bg-purple-50", icon: "text-purple-500", border: "border-purple-200" },
  rose: { bg: "bg-rose-50", icon: "text-rose-500", border: "border-rose-200" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-500", border: "border-indigo-200" },
  pink: { bg: "bg-pink-50", icon: "text-pink-500", border: "border-pink-200" },
  teal: { bg: "bg-teal-50", icon: "text-teal-500", border: "border-teal-200" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-200" },
  red: { bg: "bg-red-50", icon: "text-red-500", border: "border-red-200" },
  sky: { bg: "bg-sky-50", icon: "text-sky-500", border: "border-sky-200" },
  orange: { bg: "bg-orange-50", icon: "text-orange-500", border: "border-orange-200" },
};

export function TopicsView({ language, onSelectTopic }: TopicsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {t("topics_title", language)}
          </h1>
          <p className="text-slate-500">
            {t("topics_subtitle", language)}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOPICS.map(({ key, icon: Icon, color }) => {
            const colors = COLOR_MAP[color] || COLOR_MAP.blue;
            const label = t(key, language);
            return (
              <button
                key={key}
                onClick={() => onSelectTopic(label)}
                className={`${colors.bg} ${colors.border} border rounded-2xl p-5 text-center hover:shadow-md transition-all group`}
              >
                <div className="flex justify-center mb-3">
                  <Icon size={28} className={`${colors.icon} group-hover:scale-110 transition-transform`} />
                </div>
                <span className="font-semibold text-sm text-slate-700">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

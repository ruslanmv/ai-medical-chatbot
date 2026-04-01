"use client";

import {
  AlertCircle,
  Phone,
  Stethoscope,
  Mic,
  Shield,
  Heart,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface RightPanelProps {
  onScheduleClick: () => void;
  language?: SupportedLanguage;
  emergencyNumber?: string;
  hasActiveChat?: boolean;
  onNavigate?: (view: string) => void;
  onStartVoice?: () => void;
}

export function RightPanel({
  onScheduleClick,
  language = "en",
  emergencyNumber = "911",
  hasActiveChat = false,
  onNavigate,
  onStartVoice,
}: RightPanelProps) {
  return (
    <div className="hidden lg:flex w-80 bg-white border-l border-slate-100 p-6 flex-col gap-5 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-y-auto">
      {/* Context-aware content */}
      {!hasActiveChat ? (
        <>
          {/* No active conversation - show helpful entry points */}

          {/* Emergency number */}
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h4 className="font-bold text-sm text-red-800">
                {t("panel_emergency", language)}
              </h4>
            </div>
            <a
              href={`tel:${emergencyNumber}`}
              className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={16} />
              {t("emergency_call", language)} {emergencyNumber}
            </a>
          </div>

          {/* Start symptom check */}
          <button
            onClick={() => onNavigate?.("chat")}
            className="w-full p-4 bg-blue-50 rounded-2xl border border-blue-100 text-left hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={18} className="text-blue-500" />
              <h4 className="font-bold text-sm text-blue-800">
                {t("panel_symptom_check", language)}
              </h4>
            </div>
            <p className="text-xs text-blue-600">
              {t("home_symptoms_desc", language)}
            </p>
          </button>

          {/* Voice help */}
          <button
            onClick={onStartVoice}
            className="w-full p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-left hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Mic size={18} className="text-indigo-500" />
              <h4 className="font-bold text-sm text-indigo-800">
                {t("panel_voice_help", language)}
              </h4>
            </div>
            <p className="text-xs text-indigo-600">
              {t("home_voice_desc", language)}
            </p>
          </button>

          {/* Health topics */}
          <button
            onClick={() => onNavigate?.("topics")}
            className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} className="text-emerald-500" />
              <h4 className="font-bold text-sm text-emerald-800">
                {t("panel_top_topics", language)}
              </h4>
            </div>
            <p className="text-xs text-emerald-600">
              {t("topics_subtitle", language)}
            </p>
          </button>

          {/* Trust badges */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield size={14} className="text-emerald-500" />
              {t("badge_private", language)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield size={14} className="text-emerald-500" />
              {t("badge_no_signup", language)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield size={14} className="text-emerald-500" />
              {t("badge_free", language)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Heart size={14} className="text-rose-400" />
              {t("badge_not_doctor", language)}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Active conversation - show context-aware helper */}

          {/* Danger signs */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-500" />
              <h4 className="font-bold text-sm text-amber-800">
                {t("panel_danger_signs", language)}
              </h4>
            </div>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                {t("emergency_heart_1", language)}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                {t("emergency_breathing_1", language)}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                {t("emergency_stroke_1", language)}
              </li>
            </ul>
          </div>

          {/* When to seek care */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope size={18} className="text-blue-500" />
              <h4 className="font-bold text-sm text-blue-800">
                {t("panel_when_care", language)}
              </h4>
            </div>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                {t("emergency_heart_4", language)}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                {t("emergency_stroke_3", language)}
              </li>
            </ul>
          </div>

          {/* Emergency card - always visible */}
          <div className="mt-auto bg-red-50 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h4 className="font-bold text-sm text-red-800">
                {t("emergency_title", language)}
              </h4>
            </div>
            <a
              href={`tel:${emergencyNumber}`}
              className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={14} />
              {t("emergency_call", language)} {emergencyNumber}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

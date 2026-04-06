"use client";

import {
  AlertCircle,
  Phone,
  Stethoscope,
  AlertTriangle,
  Shield,
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

/**
 * Right panel — desktop only (hidden on mobile/tablet).
 *
 * Shows ONLY context-relevant information that isn't already in the
 * sidebar or home view. No duplication of nav items, no trust badges
 * (those are in the sidebar footer), no topic buttons (those are in
 * the sidebar nav).
 *
 * When idle: emergency number only.
 * When chatting: danger signs + when to seek care + emergency.
 */
export function RightPanel({
  language = "en",
  emergencyNumber = "911",
  hasActiveChat = false,
}: RightPanelProps) {
  return (
    <div className="hidden lg:flex w-72 bg-surface-1/50 backdrop-blur-xl border-l border-line/40 p-5 flex-col gap-4 z-20 overflow-y-auto">
      {hasActiveChat && (
        <>
          {/* Danger signs — only visible during active chat */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/40">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-amber-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {t("panel_danger_signs", language)}
              </h4>
            </div>
            <ul className="text-xs text-amber-700 dark:text-amber-300/90 space-y-1.5">
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700/40">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope size={16} className="text-blue-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {t("panel_when_care", language)}
              </h4>
            </div>
            <ul className="text-xs text-blue-700 dark:text-blue-300/90 space-y-1.5">
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
        </>
      )}

      {/* Privacy note — always visible, compact */}
      <div className="flex items-center gap-2 text-xs text-ink-subtle px-1">
        <Shield size={12} className="text-accent-500 flex-shrink-0" />
        {t("badge_private", language)} · {t("badge_free", language)}
      </div>

      {/* Emergency — always reachable at the bottom */}
      <div className="mt-auto bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-700/40">
        <a
          href={`tel:${emergencyNumber}`}
          className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <Phone size={14} />
          {t("emergency_call", language)} {emergencyNumber}
        </a>
      </div>
    </div>
  );
}

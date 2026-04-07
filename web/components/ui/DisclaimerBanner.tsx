"use client";

import { AlertTriangle } from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface DisclaimerBannerProps {
  language: SupportedLanguage;
}

export function DisclaimerBanner({ language }: DisclaimerBannerProps) {
  return (
    <div className="flex-shrink-0 px-4 py-2 bg-surface-2/50 border-t border-line/40">
      <div className="flex items-start gap-2">
        <AlertTriangle size={11} className="text-warning-500/70 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-ink-subtle leading-relaxed">
          {t("ask_disclaimer", language)}
        </p>
      </div>
    </div>
  );
}

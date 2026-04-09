"use client";

import { t, type SupportedLanguage } from "@/lib/i18n";

interface DisclaimerBannerProps {
  language: SupportedLanguage;
}

/**
 * Single-line disclaimer at the bottom of the app.
 * Minimal, non-intrusive — enterprise pattern.
 */
export function DisclaimerBanner({ language }: DisclaimerBannerProps) {
  return (
    <div className="flex-shrink-0 px-4 py-1.5 bg-surface-2/30 border-t border-line/30">
      <p className="text-[10px] text-ink-subtle text-center">
        {t("badge_not_doctor", language)}
      </p>
    </div>
  );
}

"use client";

import { ShieldCheck, Globe2, Clock4 } from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface TrustBarProps {
  language: SupportedLanguage;
  compact?: boolean;
}

/**
 * Trust layer shown under the hero. Communicates clinical credibility
 * without looking salesy: one line, muted color, subtle icons.
 */
export function TrustBar({ language, compact = false }: TrustBarProps) {
  const items = [
    { Icon: ShieldCheck, key: "trust_reviewed" as const },
    { Icon: Globe2,      key: "trust_private" as const },
    { Icon: Clock4,      key: "trust_247" as const },
  ];
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-ink-muted ${
        compact ? "text-[11px]" : "text-xs"
      }`}
    >
      {items.map(({ Icon, key }) => (
        <span key={key} className="inline-flex items-center gap-1.5 font-medium">
          <Icon size={compact ? 12 : 14} className="text-accent-500" />
          {t(key, language)}
        </span>
      ))}
    </div>
  );
}

"use client";

import {
  FileText,
  MapPin,
  ClipboardList,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type {
  NextStepsCard as NextStepsCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * NextStepsCard — terminal action menu at the end of a symptom flow.
 *
 * Renders 1-4 button rows. The "primary" action is visually emphasized
 * with the brand gradient; everything else is neutral so the user has
 * a clear hierarchy without being railroaded into one path.
 *
 * Typical actions (from buildSymptomNextSteps in guidance.ts):
 *   - Create doctor summary  (primary)
 *   - Find nearby care
 *   - Add health profile
 *   - Ask another question   (ghost)
 */

const ICONS: Record<string, LucideIcon> = {
  "file-text": FileText,
  "map-pin": MapPin,
  "clipboard-list": ClipboardList,
};

export function NextStepsCard({
  card,
  onAction,
}: {
  card: NextStepsCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft p-4 sm:p-5 animate-fade-up">
      <h3 className="font-bold text-ink-base text-[15px] tracking-tight">{card.title}</h3>
      {card.summary && (
        <p className="mt-1 text-sm text-ink-muted leading-relaxed">{card.summary}</p>
      )}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {card.actions.map((a) => {
          const Icon = a.icon ? ICONS[a.icon] : null;
          const isPrimary = a.style === "primary";
          const isGhost = a.style === "ghost";
          return (
            <button
              key={a.value}
              onClick={() => onAction(a)}
              className={
                "inline-flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all text-left " +
                (isPrimary
                  ? "bg-brand-gradient text-white shadow-soft hover:brightness-110"
                  : isGhost
                  ? "text-ink-muted hover:text-ink-base hover:bg-surface-2"
                  : "border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3")
              }
            >
              <span className="inline-flex items-center gap-2 flex-1 min-w-0">
                {Icon && <Icon size={14} className="flex-shrink-0" />}
                <span className="truncate">{a.label}</span>
              </span>
              <ArrowRight size={13} className="flex-shrink-0 opacity-60" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

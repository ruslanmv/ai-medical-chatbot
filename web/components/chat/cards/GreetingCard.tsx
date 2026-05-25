"use client";

import {
  Stethoscope,
  Pill,
  FileText,
  MapPin,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type {
  GreetingCard as GreetingCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * GreetingCard — the navigation hub shown for pure chitchat openers
 * ("hi", "hello"). Deliberately quiet: no source chip, no medical
 * questions, no "Thanks for your question…" ceremony.
 *
 * The five quick-action chips below the greeting are the user's
 * primary navigation surface for the first turn. Each chip's
 * `action.value` is a token the parent dispatches — typically by
 * synthesizing a user message like "I want to check symptoms" so
 * the next turn classifies into the right medical-flow intent.
 */

// lucide-react icon resolver — kept tiny on purpose. Add a row here
// when introducing a new card icon in cards.ts.
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  pill: Pill,
  "file-text": FileText,
  "map-pin": MapPin,
  "alert-triangle": AlertTriangle,
};

export function GreetingCard({
  card,
  onAction,
}: {
  card: GreetingCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft p-4 sm:p-5 animate-fade-up">
      <p className="text-[15px] leading-relaxed text-ink-base whitespace-pre-wrap">
        {card.text}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {card.actions.map((a, i) => {
          const Icon = a.icon ? ICONS[a.icon] : null;
          const isDanger = a.style === "danger";
          const isPrimary = a.style === "primary" || (!a.style && i === 0);
          return (
            <button
              key={a.value}
              onClick={() => onAction(a)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all " +
                (isDanger
                  ? "bg-danger-500/10 border border-danger-500/40 text-danger-600 hover:bg-danger-500/15"
                  : isPrimary
                  ? "bg-brand-gradient text-white shadow-soft hover:brightness-110"
                  : "bg-surface-2 text-ink-base border border-line/60 hover:bg-surface-3")
              }
            >
              {Icon && <Icon size={14} className="flex-shrink-0" />}
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

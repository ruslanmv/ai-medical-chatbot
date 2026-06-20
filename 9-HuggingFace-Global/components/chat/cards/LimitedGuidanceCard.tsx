"use client";

import { Info, ClipboardList, FileText, MapPin, MessageCircle, type LucideIcon } from "lucide-react";
import type {
  LimitedGuidanceCard as LimitedGuidanceCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * LimitedGuidanceCard — emitted when the user declines a profile gate
 * and the server falls back to non-personalized advice.
 *
 * The card has three jobs:
 *   1. Give a useful general answer so the user is NOT abandoned
 *   2. Be transparent about what we cannot personalize
 *   3. Offer a quick path back to the profile-completion flow
 *
 * Visual treatment: neutral surface (no danger / urgent tinting) so
 * the user knows this is safe general info, with an Info icon header
 * and a small "What we don't know about you" section to make the gap
 * explicit without being judgemental.
 */

const ICONS: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardList,
  "file-text": FileText,
  "map-pin": MapPin,
  "message-circle": MessageCircle,
};

export function LimitedGuidanceCard({
  card,
  onAction,
}: {
  card: LimitedGuidanceCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3 border-b border-line/40">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-ink-muted/15 flex items-center justify-center mt-0.5">
          <Info size={18} className="text-ink-muted" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink-base text-[15px] tracking-tight">
            General guidance
          </h3>
          <p className="mt-1 text-sm text-ink-base leading-relaxed">
            {card.general_advice}
          </p>
        </div>
      </div>

      {/* What you can do now */}
      {card.what_now.length > 0 && (
        <div className="px-4 sm:px-5 pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-2">
            What you can do now
          </h4>
          <ul className="space-y-1.5">
            {card.what_now.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-base leading-relaxed">
                <span className="text-brand-500 flex-shrink-0 mt-0.5 font-bold">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What we cannot personalize */}
      {card.missing_for_personalization.length > 0 && (
        <div className="px-4 sm:px-5 pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-2">
            What I cannot personalize without a profile
          </h4>
          <ul className="space-y-1 text-[13px] text-ink-muted leading-relaxed">
            {card.missing_for_personalization.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-ink-subtle/60 flex-shrink-0 mt-0.5">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 sm:px-5 py-4 mt-2 flex flex-wrap gap-2 border-t border-line/30">
        {card.actions.map((a) => {
          const Icon = a.icon ? ICONS[a.icon] : null;
          const isPrimary = a.style === "primary";
          const isGhost = a.style === "ghost";
          return (
            <button
              key={a.value}
              onClick={() => onAction(a)}
              className={
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all " +
                (isPrimary
                  ? "bg-brand-gradient text-white shadow-soft hover:brightness-110"
                  : isGhost
                  ? "text-ink-muted hover:text-ink-base hover:bg-surface-2"
                  : "border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3")
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

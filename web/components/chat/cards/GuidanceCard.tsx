"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import type {
  GuidanceCard as GuidanceCardData,
  CareLevel,
} from "@/lib/medical-flow/types";

/**
 * GuidanceCard — the clinical recommendation at the end of a symptom
 * flow. Carries the care-level pill that ChatGPT structurally cannot
 * ship: a deterministic, audit-grade classification of urgency.
 *
 * Visual treatment per care level:
 *   self-care  → green pill, CheckCircle icon
 *   routine    → blue pill, Activity icon
 *   urgent     → amber pill, AlertCircle icon
 *   emergency  → red pill, AlertTriangle icon + animated pulse
 */

interface CareLevelStyle {
  label: string;
  bg: string;
  border: string;
  text: string;
  pill: string;
  icon: typeof CheckCircle2;
  animate?: boolean;
}

const CARE_LEVEL_STYLE: Record<CareLevel, CareLevelStyle> = {
  "self-care": {
    label: "Self-care",
    bg: "bg-success-500/[0.04]",
    border: "border-success-500/30",
    text: "text-success-700",
    pill: "bg-success-500 text-white",
    icon: CheckCircle2,
  },
  routine: {
    label: "Routine care",
    bg: "bg-brand-500/[0.04]",
    border: "border-brand-500/30",
    text: "text-brand-700",
    pill: "bg-brand-500 text-white",
    icon: Activity,
  },
  urgent: {
    label: "Urgent care",
    bg: "bg-warning-500/[0.06]",
    border: "border-warning-500/40",
    text: "text-warning-700",
    pill: "bg-warning-500 text-white",
    icon: AlertCircle,
  },
  emergency: {
    label: "Emergency",
    bg: "bg-danger-500/[0.06]",
    border: "border-danger-500/50",
    text: "text-danger-700",
    pill: "bg-danger-500 text-white",
    icon: AlertTriangle,
    animate: true,
  },
};

export function GuidanceCard({ card }: { card: GuidanceCardData }) {
  const style = CARE_LEVEL_STYLE[card.care_level];
  const Icon = style.icon;
  return (
    <div
      className={`rounded-2xl border ${style.border} ${style.bg} shadow-soft overflow-hidden animate-fade-up`}
    >
      {/* Care-level header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 border-b border-line/30">
        <div
          className={
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center " +
            style.pill +
            (style.animate ? " animate-pulse" : "")
          }
        >
          <Icon size={20} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2 py-0.5 " +
                style.pill
              }
            >
              {style.label}
            </span>
            {card.sources && card.sources.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-subtle">
                <ShieldCheck size={10} />
                {card.sources.join(" · ")}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-bold text-ink-base text-[15px] tracking-tight">
            {card.title}
          </h3>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Why this care level */}
        <p className="text-sm text-ink-base leading-relaxed">{card.why}</p>

        {/* What to do now */}
        {card.what_now.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-2 flex items-center gap-1.5">
              <HeartPulse size={12} className="text-brand-500" />
              What you can do now
            </h4>
            <ul className="space-y-1.5">
              {card.what_now.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-base leading-relaxed">
                  <CheckCircle2
                    size={14}
                    className="text-success-500 flex-shrink-0 mt-0.5"
                    strokeWidth={2.25}
                  />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* When to seek care */}
        {card.seek_care_if.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-warning-500" />
              Seek care if
            </h4>
            <ul className="space-y-1.5">
              {card.seek_care_if.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-base leading-relaxed">
                  <span className="text-warning-500 flex-shrink-0 mt-0.5 font-bold">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

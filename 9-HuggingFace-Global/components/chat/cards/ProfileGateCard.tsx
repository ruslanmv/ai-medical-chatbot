"use client";

import {
  ShieldCheck,
  ClipboardList,
  LogIn,
  AlertTriangle,
  Check,
  type LucideIcon,
} from "lucide-react";
import type {
  ProfileGateCard as ProfileGateCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * ProfileGateCard — the structural moat that separates MedOS from
 * ChatGPT.
 *
 * Fired by the server when the user asks for deep analysis but no
 * Health Profile is on file. The card is phrased as a medical-safety
 * requirement, never as a marketing CTA: the user understands they
 * are not being upsold — they are being asked to provide the context
 * MedOS needs to be safe.
 *
 * Four buttons cover every reasonable path out:
 *   - Complete Health Profile  → opens the EHR wizard
 *   - Log in                   → restores an existing profile
 *   - Continue with general    → declines the gate, stays at Level 1/2
 *   - Emergency help           → always one tap away, never gated
 *
 * Visual treatment: a faint brand-tinted shield icon, the medical
 * justification prominent, the action row deliberately not gradient-
 * heavy so the primary "Complete" doesn't look like a paywall button.
 */

const ICONS: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardList,
  "log-in": LogIn,
  "alert-triangle": AlertTriangle,
};

export function ProfileGateCard({
  card,
  onAction,
}: {
  card: ProfileGateCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-500/30 bg-brand-500/[0.04] shadow-soft overflow-hidden animate-fade-up">
      {/* Header strip — soft brand tint, shield icon for safety framing */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-brand-500/15 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center mt-0.5">
          <ShieldCheck size={18} className="text-brand-500" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink-base text-[15px] tracking-tight">
            {card.title}
          </h3>
          <p className="mt-1 text-sm text-ink-muted leading-relaxed">
            {card.reason}
          </p>
        </div>
      </div>

      {/* Required fields — small chip row so the ask is concrete */}
      {card.required_fields.length > 0 && (
        <div className="px-4 sm:px-5 pt-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-2">
            What we need
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.required_fields.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted bg-surface-2 border border-line/50 rounded-full px-2.5 py-1"
              >
                <Check size={11} className="text-brand-500" strokeWidth={2.5} />
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="px-4 sm:px-5 py-4 mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {card.actions.map((a) => {
          const Icon = a.icon ? ICONS[a.icon] : null;
          const isPrimary = a.style === "primary";
          const isDanger = a.style === "danger";
          const isGhost = a.style === "ghost";
          return (
            <button
              key={a.value}
              onClick={() => onAction(a)}
              className={
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all " +
                (isPrimary
                  ? "bg-brand-gradient text-white shadow-soft hover:brightness-110"
                  : isDanger
                  ? "border border-danger-500/40 bg-danger-500/5 text-danger-600 hover:bg-danger-500/10"
                  : isGhost
                  ? "text-ink-muted hover:text-ink-base"
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

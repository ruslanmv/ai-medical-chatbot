"use client";

import {
  AlertTriangle,
  Phone,
  MapPin,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type {
  EmergencyCard as EmergencyCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * EmergencyCard — emitted when preCheck() fires a red-flag rule.
 *
 * NEVER gated. NEVER asks for a profile. NEVER requires login. This
 * card must work for an anonymous, mid-stride user on the worst day
 * of their life.
 *
 * Visual treatment: red border, pulsing alert icon, the call-to-action
 * button is the largest tappable surface and is locale-aware (911 in
 * US, 112 in EU, 999 in UK, …). The "Call" button uses `tel:` so on
 * mobile it dials directly.
 */

const ICONS: Record<string, LucideIcon> = {
  phone: Phone,
  "map-pin": MapPin,
  "file-text": FileText,
};

export function EmergencyCard({
  card,
  onAction,
}: {
  card: EmergencyCardData;
  onAction: (a: Action) => void;
}) {
  const handle = (a: Action) => {
    // The "Call $number" action carries value="tel:NNN" so we can
    // initiate a phone call directly on mobile devices. Desktop
    // browsers ignore the protocol gracefully.
    if (a.value.startsWith("tel:")) {
      window.location.href = a.value;
      return;
    }
    onAction(a);
  };
  return (
    <div className="rounded-2xl border-2 border-danger-500/60 bg-danger-500/[0.06] shadow-soft overflow-hidden animate-fade-up">
      {/* Header — pulsing icon + bold headline */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3 border-b border-danger-500/30">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger-500 flex items-center justify-center mt-0.5 animate-pulse">
          <AlertTriangle size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-danger-700 text-base sm:text-lg tracking-tight uppercase">
            {card.headline}
          </h3>
          <p className="mt-1 text-sm text-ink-base leading-relaxed">
            {card.reason}
          </p>
          <p className="mt-2 text-sm font-semibold text-danger-700">
            Call your local emergency number ({card.emergency_number}) now
            or go to the nearest emergency department. Do not wait for
            online advice.
          </p>
        </div>
      </div>

      {/* Action row — Call button is full-width, largest tap target */}
      <div className="p-3 sm:p-4 space-y-2">
        {card.actions.map((a, i) => {
          const Icon = a.icon ? ICONS[a.icon] : null;
          const isCall = a.value.startsWith("tel:");
          return (
            <button
              key={a.value}
              onClick={() => handle(a)}
              className={
                "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all " +
                (isCall
                  ? "bg-danger-500 text-white text-base shadow-soft hover:brightness-110"
                  : i === 1
                  ? "border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3"
                  : "border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3")
              }
            >
              {Icon && <Icon size={isCall ? 18 : 14} className="flex-shrink-0" />}
              {a.label}
            </button>
          );
        })}
      </div>

      <p className="px-4 sm:px-5 pb-4 text-[11px] text-ink-subtle italic text-center">
        MedOS can help you prepare what to say, but it should not delay
        emergency care.
      </p>
    </div>
  );
}

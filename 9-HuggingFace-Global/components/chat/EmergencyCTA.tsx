"use client";

import { Phone } from "lucide-react";

interface EmergencyCTAProps {
  number: string;
  /** When true, the button pulses and glows more aggressively (red-flag detected). */
  urgent?: boolean;
  /** Compact variant renders just the icon + number without the label. */
  compact?: boolean;
  label?: string;
}

/**
 * Sticky, always-reachable emergency button. Uses a pulse-ring animation
 * around a circular core so it reads as urgent without being noisy.
 */
export function EmergencyCTA({
  number,
  urgent = false,
  compact = false,
  label = "Call",
}: EmergencyCTAProps) {
  return (
    <a
      href={`tel:${number}`}
      aria-label={`Call emergency ${number}`}
      className={`group relative inline-flex items-center gap-2 rounded-full bg-danger-500 text-white font-bold transition-all hover:bg-danger-600 ${
        compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
      } ${urgent ? "animate-pulse-ring shadow-danger-glow" : "shadow-soft"}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white/20 ${
          compact ? "w-5 h-5" : "w-6 h-6"
        }`}
      >
        <Phone size={compact ? 11 : 13} strokeWidth={2.75} />
      </span>
      {!compact && <span>{label}</span>}
      <span className="font-black tracking-tight">{number}</span>
    </a>
  );
}

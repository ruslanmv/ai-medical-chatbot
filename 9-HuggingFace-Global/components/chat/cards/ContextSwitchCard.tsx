"use client";

import { ArrowRightLeft } from "lucide-react";
import type {
  ContextSwitchCard as ContextSwitchCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * ContextSwitchCard — emitted by the model when it detects that the
 * latest user turn introduced a new topic or a new patient mid-flow
 * (e.g. parent was triaging chest pain, then asked about their child's
 * fever). The card acknowledges the change explicitly so the user
 * never gets the "still asking about chest-pain duration for a fever
 * question" failure mode — and offers a one-click confirmation of the
 * switch.
 *
 * Detection is the model's job (the AI-first SYSTEM_PROMPT forbids
 * keyword rules). The frontend only renders + dispatches.
 */
export function ContextSwitchCard({
  card,
  onAction,
}: {
  card: ContextSwitchCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-accent-500/40 bg-accent-500/[0.06] shadow-soft animate-fade-up overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-600">
          <ArrowRightLeft size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
            <span>{card.previous_topic}</span>
            <span aria-hidden>→</span>
            <span className="text-accent-600">{card.new_topic}</span>
            {card.new_patient && (
              <span className="ml-1 inline-flex items-center rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent-700 dark:text-accent-300">
                new patient
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-base leading-relaxed">
            {card.response}
          </p>
          <div className="mt-3">
            <button
              onClick={() => onAction(card.suggested_action)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold px-3.5 py-2 shadow-soft hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {card.suggested_action.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

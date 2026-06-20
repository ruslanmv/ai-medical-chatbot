"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert, Check } from "lucide-react";
import type {
  SafetyCheckCard as SafetyCheckCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * SafetyCheckCard — red-flag screening checklist. Always rendered
 * as the FIRST card in a symptom flow.
 *
 * UX rules:
 *   - "None of these" and "Not sure" are visually neutral (green-tinted
 *     vs. amber-tinted). The danger-tinted options are the actual red
 *     flags — visually pre-warning the user.
 *   - User can multi-select (a real medical intake would). Selecting
 *     "None of these" deselects everything else and vice-versa.
 *   - "Continue" is the explicit confirmation. We don't auto-submit on
 *     selection because a moment to read what they ticked is good
 *     medical-safety UX.
 */

export function SafetyCheckCard({
  card,
  onAction,
}: {
  card: SafetyCheckCardData;
  onAction: (a: Action) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isDanger = (a: Action) => a.style === "danger";
  const isSafeOption = (v: string) => v === "rf:none" || v === "rf:unsure";

  const toggle = (a: Action) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const v = a.value;
      if (next.has(v)) {
        next.delete(v);
      } else {
        if (isSafeOption(v)) {
          // Picking "None of these" / "Not sure" clears any red flags.
          return new Set([v]);
        }
        // Picking any red flag clears the safe options.
        if (isDanger(a)) {
          for (const x of Array.from(next)) {
            if (isSafeOption(x)) next.delete(x);
          }
        }
        next.add(v);
      }
      return next;
    });
  };

  const submit = () => {
    if (selected.size === 0) return;
    const values = Array.from(selected);
    // Compose the synthetic user message: a comma-joined list of the
    // selected tokens. The server's red-flag detector picks any
    // "rf:back:*" / "rf:hd:*" / "rf:abd:*" out of the message.
    const action: Action = {
      label: values
        .map((v) => card.options.find((o) => o.value === v)?.label || v)
        .join(", "),
      value: values.join(", "),
    };
    onAction(action);
  };

  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft overflow-hidden animate-fade-up">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-line/40 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-warning-500/15 flex items-center justify-center mt-0.5">
          <ShieldAlert size={18} className="text-warning-500" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink-base text-[15px] tracking-tight">
            {card.title}
          </h3>
          <p className="mt-1 text-sm text-ink-muted leading-relaxed">
            {card.question}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-1.5">
        {card.options.map((a) => {
          const isSelected = selected.has(a.value);
          const danger = isDanger(a);
          return (
            <button
              key={a.value}
              onClick={() => toggle(a)}
              className={
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all " +
                (isSelected
                  ? danger
                    ? "bg-danger-500/10 border border-danger-500/40 text-danger-600"
                    : "bg-success-500/10 border border-success-500/40 text-success-600"
                  : "border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3")
              }
            >
              <span
                className={
                  "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center " +
                  (isSelected
                    ? danger
                      ? "bg-danger-500 border-danger-500"
                      : "bg-success-500 border-success-500"
                    : "border-line/60")
                }
              >
                {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1">{a.label}</span>
              {danger && !isSelected && (
                <AlertTriangle size={12} className="text-danger-500/50 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 sm:px-4 pb-4 pt-1">
        <button
          onClick={submit}
          disabled={selected.size === 0}
          className="w-full py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-soft hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import type {
  IntakeCard as IntakeCardData,
  Action,
} from "@/lib/medical-flow/types";

/**
 * IntakeCard — single question per step. The medical-flow state
 * machine emits one of these per step (typically location → duration
 * → severity for symptom flows), and the user's answer becomes the
 * synthetic message that drives the NEXT card.
 *
 * Three input modes:
 *   - chips    : single-select pill row (location, duration)
 *   - slider   : 0-10 numeric scale (severity)
 *   - text     : free-text input (future — for "describe more" prompts)
 */

export function IntakeCard({
  card,
  onAction,
}: {
  card: IntakeCardData;
  onAction: (a: Action) => void;
}) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft overflow-hidden animate-fade-up">
      {/* Progress dots — small, unobtrusive, gives a sense of "almost done" */}
      <ProgressDots progress={card.progress} />

      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-line/40 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center mt-0.5">
          <ListChecks size={18} className="text-brand-500" strokeWidth={2.25} />
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

      <div className="p-3 sm:p-4">
        {card.input_type === "chips" && card.options && (
          <ChipPicker options={card.options} onPick={onAction} />
        )}
        {card.input_type === "slider" && card.slider && (
          <SliderPicker
            min={card.slider.min}
            max={card.slider.max}
            minLabel={card.slider.min_label}
            maxLabel={card.slider.max_label}
            onPick={onAction}
          />
        )}
        {card.input_type === "text" && (
          <TextPicker onPick={onAction} placeholder={card.question} />
        )}
      </div>
    </div>
  );
}

function ProgressDots({ progress }: { progress: number }) {
  // Render 5 dots, fill proportional to progress (0..1).
  const filled = Math.max(1, Math.round(progress * 5));
  return (
    <div className="flex items-center gap-1.5 px-4 sm:px-5 py-3 border-b border-line/30">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            "h-1 flex-1 rounded-full transition-all " +
            (i < filled ? "bg-brand-500" : "bg-line/40")
          }
        />
      ))}
    </div>
  );
}

function ChipPicker({
  options,
  onPick,
}: {
  options: Action[];
  onPick: (a: Action) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((a) => (
        <button
          key={a.value}
          onClick={() => onPick(a)}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border border-line/60 bg-surface-2 text-ink-base hover:bg-brand-500/10 hover:border-brand-500/40 hover:text-brand-600 transition-all"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function SliderPicker({
  min,
  max,
  minLabel,
  maxLabel,
  onPick,
}: {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onPick: (a: Action) => void;
}) {
  const [value, setValue] = useState<number>(Math.round((min + max) / 2));
  return (
    <div>
      <div className="text-center mb-2">
        <span className="text-4xl font-black text-brand-500 tabular-nums">{value}</span>
        <span className="text-base text-ink-subtle ml-1">/ {max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10))}
        className="w-full accent-brand-500 cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-ink-subtle mt-1.5 px-0.5">
        <span>{min}{minLabel ? ` · ${minLabel}` : ""}</span>
        <span>{max}{maxLabel ? ` · ${maxLabel}` : ""}</span>
      </div>
      <button
        onClick={() =>
          onPick({ label: `Severity ${value}/${max}`, value: `slider:${value}` })
        }
        className="mt-4 w-full py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-soft hover:brightness-110 transition-all"
      >
        Continue
      </button>
    </div>
  );
}

function TextPicker({
  onPick,
  placeholder,
}: {
  onPick: (a: Action) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    if (!value.trim()) return;
    onPick({ label: value.trim(), value: `text:${value.trim()}` });
  };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-line/60 bg-surface-2 px-3 py-2.5 text-sm text-ink-base placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-soft hover:brightness-110 disabled:opacity-40 transition-all"
      >
        Send
      </button>
    </div>
  );
}

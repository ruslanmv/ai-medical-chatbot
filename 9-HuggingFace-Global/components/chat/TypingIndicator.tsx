"use client";

import { Stethoscope } from "lucide-react";

interface TypingIndicatorProps {
  label: string;
}

/**
 * The "model is thinking" state, purpose-built for a medical chatbot:
 * an avatar + the word "Analyzing symptoms…" shimmering, instead of
 * the generic three-dot animation. Increases perceived intelligence.
 */
export function TypingIndicator({ label }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 mb-6 animate-fade-up">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center shadow-soft">
        <Stethoscope size={16} className="text-white" />
      </div>
      <div className="glass-card rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
        <span className="shimmer-text text-sm font-semibold tracking-tight">
          {label}
        </span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce delay-100" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce delay-200" />
        </span>
      </div>
    </div>
  );
}

"use client";

import { Stethoscope, User2, ShieldCheck } from "lucide-react";
import type { ChatMessage } from "@/lib/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
  showSourceChip?: boolean;
}

/**
 * AI answers are rendered as cards with:
 *  - an avatar + "MedOS" header,
 *  - an optional source chip ("Reviewed with medical guidelines") on the
 *    first assistant reply,
 *  - inline parsing of the bold section headers emitted by the model
 *    ("**Summary**", "**What it could be**", ...) into structured blocks
 *    with a brand-colored left rail.
 *
 * User bubbles keep the classic right-aligned chat style.
 */
export function MessageBubble({ message, showSourceChip }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-up">
        <div className="max-w-[85%] flex items-start gap-2">
          <div className="order-2 flex-shrink-0 w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-ink-muted">
            <User2 size={16} />
          </div>
          <div className="order-1">
            <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-brand-gradient text-white shadow-soft leading-relaxed text-[15px]">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle text-right">
              {message.timestamp}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI message — parse section headings to structure the output.
  const sections = parseSections(message.content);

  return (
    <div className="flex justify-start mb-6 animate-fade-up">
      <div className="max-w-[88%] flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-soft">
          <Stethoscope size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-ink-base tracking-tight">
              MedOS
            </span>
            {showSourceChip && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400 bg-accent-500/10 border border-accent-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck size={10} />
                WHO · CDC · NHS
              </span>
            )}
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-line/60 bg-surface-1 shadow-soft px-4 py-3.5 text-[15px] leading-relaxed text-ink-base">
            {sections.length > 1 ? (
              sections.map((s, i) =>
                s.heading ? (
                  <div key={i} className="answer-section">
                    <h4 className="font-bold text-ink-base text-[13px] uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
                      {s.heading}
                    </h4>
                    <p className="whitespace-pre-wrap text-ink-base/95">
                      {s.body}
                    </p>
                  </div>
                ) : (
                  <p
                    key={i}
                    className="whitespace-pre-wrap text-ink-base/95 first:mt-0 mt-2"
                  >
                    {s.body}
                  </p>
                ),
              )
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          <div className="mt-1 text-[11px] text-ink-subtle">
            {message.timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}

type Section = { heading?: string; body: string };

/**
 * Splits an AI answer on **Heading** markers so the UI can render each
 * section as a distinct block. Falls back to a single body when the
 * model didn't follow the structured output contract.
 */
function parseSections(text: string): Section[] {
  if (!text) return [{ body: "" }];
  // Match lines that look like "**Summary**" or "**Self-care**".
  const regex = /\*\*([^*\n]{2,60})\*\*\s*:?\s*/g;
  const sections: Section[] = [];
  let lastIndex = 0;
  let currentHeading: string | undefined;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const body = text.slice(lastIndex, m.index).trim();
    if (body) sections.push({ heading: currentHeading, body });
    currentHeading = m[1].trim();
    lastIndex = m.index + m[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) sections.push({ heading: currentHeading, body: tail });
  return sections.length ? sections : [{ body: text }];
}

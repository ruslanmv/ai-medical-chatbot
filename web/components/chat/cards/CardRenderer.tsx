"use client";

/**
 * CardRenderer — dispatches to the right Card sub-component by `kind`.
 *
 * The parser pulls `[card:KIND] … [/card]` blocks out of the assistant
 * message content (see MessageBubble), validates them as JSON, and
 * passes the result here. Unknown / malformed cards fall back to a
 * neutral text bubble so a newer server can ship card kinds the
 * client doesn't yet understand without breaking the chat.
 */

import type { Card, Action } from "@/lib/medical-flow/types";
import { GreetingCard } from "./GreetingCard";
import { ProfileGateCard } from "./ProfileGateCard";
import { SafetyCheckCard } from "./SafetyCheckCard";
import { IntakeCard } from "./IntakeCard";
import { GuidanceCard } from "./GuidanceCard";
import { NextStepsCard } from "./NextStepsCard";
import { DoctorSummaryCard } from "./DoctorSummaryCard";
import { LimitedGuidanceCard } from "./LimitedGuidanceCard";
import { EmergencyCard } from "./EmergencyCard";

export interface CardActionHandler {
  /** Fired when the user clicks any chip / button inside a card. The
   *  parent decides what to do based on `action.value` — typical
   *  routings:
   *    - `intent:check_symptoms`  → synthesize a user message
   *    - `open_ehr_wizard`        → setActiveNav('ehr-wizard')
   *    - `open_login`             → setActiveNav('login')
   *    - `open_emergency`         → setActiveNav('emergency')
   *    - `continue_general`       → synthesize a user message
   *    - `rf:none`                → synthesize "I have none of these"
   *    - `slider:N`               → synthesize a structured answer
   *
   *  Keeping the dispatch outside the card means the card library
   *  stays UI-only and can be unit-tested in isolation.
   */
  (action: Action, card: Card): void;
}

export function CardRenderer({
  card,
  onAction,
}: {
  card: Card;
  onAction: CardActionHandler;
}) {
  switch (card.kind) {
    case "greeting":
      return <GreetingCard card={card} onAction={(a) => onAction(a, card)} />;
    case "profile_gate":
      return <ProfileGateCard card={card} onAction={(a) => onAction(a, card)} />;
    case "safety_check":
      return <SafetyCheckCard card={card} onAction={(a) => onAction(a, card)} />;
    case "intake":
      return <IntakeCard card={card} onAction={(a) => onAction(a, card)} />;
    case "guidance":
      // Guidance cards are read-only — no action callback wired.
      return <GuidanceCard card={card} />;
    case "limited_guidance":
      return <LimitedGuidanceCard card={card} onAction={(a) => onAction(a, card)} />;
    case "emergency":
      return <EmergencyCard card={card} onAction={(a) => onAction(a, card)} />;
    case "next_steps":
      return <NextStepsCard card={card} onAction={(a) => onAction(a, card)} />;
    case "doctor_summary":
      // Doctor summary handles copy/share/print internally; no parent
      // callback needed.
      return <DoctorSummaryCard card={card} />;
    // Other kinds ship in subsequent batches. Until then they degrade
    // gracefully to a neutral fallback so a forward-rolling server
    // never breaks the client.
    default:
      return (
        <div className="rounded-2xl border border-line/60 bg-surface-1 px-4 py-3 text-sm text-ink-muted shadow-soft">
          <span className="font-mono text-xs opacity-60">
            [{(card as { kind: string }).kind}]
          </span>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Parser: pull [card:KIND] … [/card] blocks out of mixed text content
// ─────────────────────────────────────────────────────────────────────

export type ContentSegment =
  | { type: "text"; text: string }
  | { type: "card"; card: Card };

const CARD_RE = /\[card:([a-z_]+)\]\s*([\s\S]*?)\s*\[\/card\]/gi;

/** Split a streamed AI message into ordered text + card segments.
 *
 *  Robust to:
 *    - mid-stream parse: partial trailing card markers are returned
 *      as text and re-parsed on the next chunk-render
 *    - malformed JSON inside a marker: that one card falls back to
 *      its raw text representation, the rest of the message still
 *      renders
 *    - unknown future kinds: returned as cards with their raw kind,
 *      the dispatcher renders a graceful fallback
 */
export function parseCardSegments(content: string): ContentSegment[] {
  if (!content) return [];
  const out: ContentSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  CARD_RE.lastIndex = 0;
  while ((m = CARD_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index).trim();
      if (text) out.push({ type: "text", text });
    }
    try {
      const card = JSON.parse(m[2]) as Card;
      if (!card.kind) (card as Card).kind = m[1] as Card["kind"];
      out.push({ type: "card", card });
    } catch {
      // Malformed JSON inside the marker — keep the raw block as text
      // so the failure is visible, not silently dropped.
      out.push({ type: "text", text: m[0] });
    }
    lastIndex = m.index + m[0].length;
  }
  const tail = content.slice(lastIndex).trim();
  if (tail) out.push({ type: "text", text: tail });
  return out;
}

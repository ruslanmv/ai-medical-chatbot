/**
 * Conversation state derivation — single source of truth for what the
 * orchestrator knows about the current consultation.
 *
 * Design choice: derive state on each request from the message array
 * the client sends, rather than holding it in a server-side Map.
 *
 * Rationale:
 *   - The Vercel runtime is per-request; in-memory state evaporates on
 *     cold start. A Map would require Redis/KV the moment we wanted it
 *     to survive a restart, which is premature for the current stage.
 *   - The client already sends the full conversation in every turn
 *     (the OpenAI-style /v1/chat/completions contract), so the wire
 *     payload is the canonical history. Deriving state from it is
 *     deterministic and avoids state-drift bugs.
 *   - When we later move to Redis, the same shape returned by
 *     `deriveConversationState` becomes the persisted document — the
 *     derivation function turns into a hydration check.
 *
 * What we extract:
 *   - chief_complaint: first non-system user message
 *   - active_topic: title of the most recent topic-bearing assistant
 *     card (safety_check / intake / guidance / next_steps)
 *   - patient_subject: heuristic — "self" by default; flipped to
 *     "child"/"baby"/"parent" when the user explicitly references them
 *   - safety_check_options[]: the options the last safety_check card
 *     presented, plus the option(s) the user picked next
 *   - intake_answers[]: each intake card's title/question paired with
 *     the user's next textual reply (this is what the doctor_summary
 *     uses for duration / severity / location)
 *   - guidance: snapshot of the latest guidance card (why + what_now +
 *     seek_care_if + care_level + sources)
 */

import type { Card } from "../medical-flow/types";

/** Wire shape — matches what the client sends. */
export interface WireMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IntakeAnswer {
  /** The intake card's title (e.g. "How long?"). */
  question: string;
  /** Optional finer prompt from the card (e.g. "How long has it been
   *  happening?"). */
  prompt?: string;
  /** The user's reply — already cleaned of any `<action/>` block. */
  answer: string;
  /** If the user clicked a chip whose value was `selected:duration:1-3d`
   *  the structured value lives here too. */
  selected_value?: string;
}

export interface DerivedState {
  /** First free-text user turn — what the patient came in for. */
  chief_complaint: string | null;
  /** Title of the most recent topic-bearing assistant card. Null on a
   *  cold conversation. */
  active_topic: string | null;
  /** Subject of the consultation — defaults to the speaker. */
  patient_subject: "self" | "child" | "baby" | "other";
  /** Whether any flow card has been emitted yet (used by the
   *  doctor_summary builder to decide if there's anything to summarise). */
  has_started_flow: boolean;
  /** Safety-check labels the user explicitly ticked. Empty when they
   *  chose "None of these" / "Not sure". */
  warning_signs_present: string[];
  /** All safety-check option labels offered across the conversation —
   *  what was screened for, regardless of whether the user picked any. */
  red_flags_checked: string[];
  /** Intake question/answer pairs in chronological order. */
  intake_answers: IntakeAnswer[];
  /** Optional severity (0–10) extracted from a slider-style intake. */
  severity?: number;
  /** Most recent guidance card emitted, if any. */
  guidance?: {
    title: string;
    care_level: "self-care" | "routine" | "urgent" | "emergency";
    why: string;
    what_now: string[];
    seek_care_if: string[];
    sources?: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────────────

const CARD_RE = /\[card:([a-z_]+)\]\s*(\{[\s\S]*?\})\s*\[\/card\]/gi;
const ACTION_TAG_RE = /<action\s+[^>]*\/>/gi;
const ACTION_SELECT_RE = /<action\s+type="select"\s+value="([^"]+)"\s+label="([^"]+)"\s*\/>/i;

/** Strip embedded `<action/>` blocks from user-turn text so the chief
 *  complaint and intake replies read as natural language. */
function cleanUserText(text: string): string {
  return text.replace(ACTION_TAG_RE, "").trim();
}

/** Lift `[card:KIND] {...} [/card]` blocks out of an assistant turn. */
function extractCards(content: string): Card[] {
  const out: Card[] = [];
  let m: RegExpExecArray | null;
  CARD_RE.lastIndex = 0;
  while ((m = CARD_RE.exec(content)) !== null) {
    try {
      const card = JSON.parse(m[2]) as Card;
      if (!card.kind) (card as Card).kind = m[1] as Card["kind"];
      out.push(card);
    } catch {
      // ignore — malformed JSON; the safety validator on the client
      // will surface this in dev tools.
    }
  }
  return out;
}

function severityFromText(text: string): number | undefined {
  // Accept "Severity 4/10", "4/10", "4 / 10" — the bubble label the
  // slider chip produces is "Severity N/10".
  const m = text.match(/(\d{1,2})\s*\/\s*10/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : undefined;
}

function detectPatientSubject(chief: string | null): DerivedState["patient_subject"] {
  if (!chief) return "self";
  const t = chief.toLowerCase();
  if (/\b(my\s+baby|my\s+infant|newborn)\b/.test(t)) return "baby";
  if (/\b(my\s+child|my\s+kid|my\s+son|my\s+daughter|mio\s+figlio|mi\s+hijo)\b/.test(t))
    return "child";
  return "self";
}

// ─────────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────────

/**
 * Walk the full message history once and produce a derived state
 * snapshot the action router and prompt builder consume.
 *
 * Pure: the same input always produces the same output. Side-effect
 * free. Safe to call on every request.
 */
export function deriveConversationState(messages: WireMessage[]): DerivedState {
  const state: DerivedState = {
    chief_complaint: null,
    active_topic: null,
    patient_subject: "self",
    has_started_flow: false,
    warning_signs_present: [],
    red_flags_checked: [],
    intake_answers: [],
  };

  // Track the most recently emitted card-bearing assistant turn so we
  // can pair it with the user's next reply (intake → user answer).
  let pendingIntakeQuestion: string | null = null;
  let pendingIntakePrompt: string | null = null;
  let pendingSafetyOptions: { label: string; value: string }[] | null = null;

  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      const cleaned = cleanUserText(m.content);
      // First non-empty user message is the chief complaint.
      if (!state.chief_complaint && cleaned.length > 0) {
        state.chief_complaint = cleaned;
      }
      // Pair with whatever the assistant most recently asked.
      if (pendingIntakeQuestion) {
        const sel = m.content.match(ACTION_SELECT_RE);
        state.intake_answers.push({
          question: pendingIntakeQuestion,
          prompt: pendingIntakePrompt ?? undefined,
          answer: cleaned,
          selected_value: sel?.[1],
        });
        const sev = severityFromText(cleaned);
        if (sev !== undefined) state.severity = sev;
        pendingIntakeQuestion = null;
        pendingIntakePrompt = null;
      }
      if (pendingSafetyOptions) {
        // The user's reply to a safety_check is a label from the
        // option list. Match it case-insensitively; "rf:none" /
        // "rf:unsure" → no warning signs present.
        const sel = m.content.match(ACTION_SELECT_RE);
        const value = sel?.[1];
        const label = (sel?.[2] || cleaned).trim();
        if (value !== "rf:none" && value !== "rf:unsure") {
          // Find the matching option's label by value, or use the
          // raw user text if no structured value came through.
          const matched = pendingSafetyOptions.find((o) => o.value === value);
          state.warning_signs_present.push(matched?.label || label);
        }
        pendingSafetyOptions = null;
      }
      continue;
    }

    // assistant
    const cards = extractCards(m.content);
    if (cards.length === 0) continue;

    for (const card of cards) {
      state.has_started_flow = true;
      switch (card.kind) {
        case "safety_check":
          state.active_topic = card.title;
          // Remember the option labels so we can credit which red
          // flags were "checked" (regardless of whether ticked).
          for (const o of card.options || []) {
            if (
              o.value === "rf:none" ||
              o.value === "rf:unsure" ||
              state.red_flags_checked.includes(o.label)
            )
              continue;
            state.red_flags_checked.push(o.label);
          }
          pendingSafetyOptions = (card.options || []).map((o) => ({
            label: o.label,
            value: o.value,
          }));
          break;
        case "intake":
          state.active_topic = card.title;
          pendingIntakeQuestion = card.title;
          pendingIntakePrompt = card.question;
          break;
        case "guidance":
          state.active_topic = card.title;
          state.guidance = {
            title: card.title,
            care_level: card.care_level,
            why: card.why,
            what_now: card.what_now,
            seek_care_if: card.seek_care_if,
            sources: card.sources,
          };
          break;
        case "next_steps":
          // Don't touch active_topic — the next_steps card's title is
          // meta ("Next steps"), not a clinical topic. The active topic
          // is whatever symptom flow the safety_check/intake/guidance
          // sequence was anchored on.
          break;
        default:
          // greeting / profile_gate / limited_guidance / emergency /
          // doctor_summary / context_switch — don't drive flow slots.
          break;
      }
    }
  }

  // Patient subject is a function of the chief complaint text.
  state.patient_subject = detectPatientSubject(state.chief_complaint);

  return state;
}

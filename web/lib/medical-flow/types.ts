/**
 * Medical-flow card schema — shared between server (emitter) and client (renderer).
 *
 * Cards are the structured-UI primitive that replaces free-form medical
 * paragraphs. Each card has a discriminated `kind` and carries only the
 * data the renderer needs. The LLM stays out of UI decisions: it fills
 * fields, the server decides which kind to emit, the client decides how
 * to render. This gives us an auditable, physician-friendly conversation
 * trail and makes the three-level access model (general → guided → deep)
 * enforceable in code rather than prompt.
 *
 * Wire format: cards are emitted inside the existing chat content stream
 * as fenced JSON between `[card:KIND]` and `[/card]` markers — the same
 * pattern the bubble splitter already uses. A single AI turn can contain
 * any mix of bubbles and cards in any order.
 */

export type ActionStyle = 'primary' | 'secondary' | 'danger' | 'ghost';

/** A button or chip the user can tap inside a card. */
export interface Action {
  /** Display text. */
  label: string;
  /** Machine-readable token. When the user clicks, the client either
   *  routes locally (e.g. `complete_profile` → open EHR wizard) or sends
   *  it as a synthetic user message (e.g. `selected:lower_back`) so the
   *  next LLM turn has structured input. */
  value: string;
  style?: ActionStyle;
  /** Optional lucide-react icon name; renderer maps to component. */
  icon?: string;
}

/** Care-level pill on the guidance card. Mirrors clinical triage tiers. */
export type CareLevel = 'self-care' | 'routine' | 'urgent' | 'emergency';

/** Level 1: general-public access. Level 2: ephemeral micro-profile in
 *  chat. Level 3: persisted EHR profile, deep analysis unlocked. */
export type AccessLevel = 1 | 2 | 3;

/** Intent classification — drives which card the server emits next. */
export type Intent =
  | 'chitchat'
  | 'basic_symptom'
  | 'deep_analysis'
  | 'medication'
  | 'test_result'
  | 'mental_health'
  | 'emergency';

// ─────────────────────────────────────────────────────────────────────
// Card kinds
// ─────────────────────────────────────────────────────────────────────

export interface GreetingCard {
  kind: 'greeting';
  /** Single-sentence opener. No medical questions, no source chip. */
  text: string;
  /** Quick-action chips: "Check symptoms" / "Medication" / "Emergency" / … */
  actions: Action[];
}

export interface SafetyCheckCard {
  kind: 'safety_check';
  title: string;
  question: string;
  /** Multi-select checklist. The user picks zero or more; "None of these"
   *  is always the safe-default option. */
  options: Action[];
  /** What to do when any non-safe option is selected — usually emergency. */
  on_positive: 'emergency' | 'urgent_care' | 'continue';
}

export interface IntakeCard {
  kind: 'intake';
  title: string;
  question: string;
  /** Single-select chips, OR a slider for severity. The renderer
   *  decides which input to show based on `input_type`. */
  input_type: 'chips' | 'slider' | 'text';
  options?: Action[]; // for chips
  slider?: { min: number; max: number; min_label?: string; max_label?: string };
  /** 0..1 — shown as a progress dot row above the question. */
  progress: number;
}

export interface GuidanceCard {
  kind: 'guidance';
  title: string;
  /** Color-coded pill at the top of the card. */
  care_level: CareLevel;
  /** One short paragraph stating why this care level was chosen. */
  why: string;
  /** What the user can safely do now. */
  what_now: string[];
  /** Red-flag symptoms that should change the care level if they appear. */
  seek_care_if: string[];
  /** Authoritative-source labels rendered as a small chip row. */
  sources?: string[];
}

export interface ProfileGateCard {
  kind: 'profile_gate';
  title: string;
  /** Medical-safety justification — never marketing copy. */
  reason: string;
  /** Plain-language list of fields the deep analysis needs. */
  required_fields: string[];
  actions: Action[];
}

export interface NextStepsCard {
  kind: 'next_steps';
  title: string;
  /** Optional one-line summary of where we are in the conversation. */
  summary?: string;
  actions: Action[];
}

export interface LimitedGuidanceCard {
  kind: 'limited_guidance';
  /** What we CAN say without personalization — usually a short
   *  symptom-aware generic answer. */
  general_advice: string;
  /** Bulleted list of safe, general next steps. */
  what_now: string[];
  /** Explicit list of the personalization the user is missing out on.
   *  Phrased as "I cannot personalize this based on …" so the user
   *  understands what the gate would have unlocked. */
  missing_for_personalization: string[];
  /** Action chips: Add Health Profile, Create general summary, etc. */
  actions: Action[];
}

export interface EmergencyCard {
  kind: 'emergency';
  /** One-sentence headline — "This may be an emergency." */
  headline: string;
  /** Why we classified this as urgent (rule fires from preCheck). */
  reason: string;
  /** Locale-aware emergency number (911 / 112 / 999 / …). */
  emergency_number: string;
  /** Actions: Call emergency / Find nearby ED / Prepare summary. */
  actions: Action[];
}

export interface DoctorSummaryCard {
  kind: 'doctor_summary';
  chief_complaint: string;
  duration: string;
  severity?: number;
  red_flags_checked: string[];
  warning_signs_present: string[];
  current_guidance: string;
  seek_care_if: string[];
  /** Generated timestamp, ISO-8601 — used for the printed summary. */
  generated_at: string;
}

export type Card =
  | GreetingCard
  | SafetyCheckCard
  | IntakeCard
  | GuidanceCard
  | ProfileGateCard
  | LimitedGuidanceCard
  | EmergencyCard
  | NextStepsCard
  | DoctorSummaryCard;

// ─────────────────────────────────────────────────────────────────────
// Wire format helpers
// ─────────────────────────────────────────────────────────────────────

/** Marker emitted by the server, parsed by the client. The JSON body
 *  must be valid `Card` of the matching kind — type-checked by both
 *  ends since this file is shared. */
export const CARD_OPEN_PATTERN = /\[card:([a-z_]+)\]\s*/i;
export const CARD_CLOSE = '[/card]';

/** Server-side: serialize a card to the wire format. */
export function serializeCard(card: Card): string {
  return `\n[card:${card.kind}]\n${JSON.stringify(card)}\n[/card]\n`;
}

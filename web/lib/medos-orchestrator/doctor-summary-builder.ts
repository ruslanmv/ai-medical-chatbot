/**
 * Doctor-summary builder — turns a derived `ConversationState` into a
 * `doctor_summary` card the UI can render directly.
 *
 * Why this is in the orchestrator (server-side), not in the model
 * ─────────────────────────────────────────────────────────────────
 * The doctor_summary action is the canonical example of a click that
 * must NEVER re-enter the LLM through the symptom-intake door. If we
 * leave it to the model it loops back into chest-pain triage every
 * other turn — exactly the failure mode the user keeps catching.
 *
 * The orchestrator owns it instead: when a request arrives with
 * `action: { type: "doctor_summary" }`, we derive the structured state
 * once, build the card from the slots already collected, and stream it
 * back as a single SSE frame containing the `[card:doctor_summary]
 * {...} [/card]` block. No LLM call, no chance of a loop.
 *
 * Doctor-summary fields are filled from real conversation slots —
 * never a chest-pain (or any other) template. Missing slots degrade
 * gracefully ("Not collected") rather than being invented.
 */

import type { DerivedState, IntakeAnswer } from "./conversation-state";
import type { DoctorSummaryCard } from "../medical-flow/types";

const NOT_COLLECTED = "Not collected during this consultation";

/** Map an intake question/title heuristically to the doctor_summary
 *  slot it most likely fills (duration vs severity vs free-text). */
function pickAnswer(
  answers: IntakeAnswer[],
  matcher: RegExp,
): string | undefined {
  for (let i = answers.length - 1; i >= 0; i--) {
    const a = answers[i];
    if (matcher.test(a.question) || (a.prompt && matcher.test(a.prompt))) {
      return a.answer;
    }
  }
  return undefined;
}

/**
 * Build a `doctor_summary` card from the state derived from the chat
 * history. Pure: no I/O, no clock side-effects beyond `generated_at`
 * which the validator will fill if missing anyway.
 */
export function buildDoctorSummary(state: DerivedState): DoctorSummaryCard {
  // Chief complaint: first user message, falling back to the most
  // recent active topic if the conversation started with a button click.
  const chief = state.chief_complaint || state.active_topic || NOT_COLLECTED;

  // Duration: any intake question whose title/prompt mentions "long",
  // "duration", "when did" — covers the localized variants the model
  // produces (the AI-first prompt encourages paraphrase).
  const duration =
    pickAnswer(state.intake_answers, /how\s*long|duration|when\s+did/i) ||
    NOT_COLLECTED;

  // Severity preferentially comes from the slider extraction (already
  // typed as a number in state.severity). If the model used chips
  // instead, fall back to whichever intake answer mentioned a 0-10
  // scale.
  const severity =
    typeof state.severity === "number" ? state.severity : undefined;

  // What we screened for (the option list of the latest safety_check),
  // and what the user actually reported. The validator already pinned
  // rf:none / rf:unsure out of the warning_signs_present list, so an
  // empty array here means "user reported none of the listed red flags".
  const red_flags_checked = state.red_flags_checked.length
    ? state.red_flags_checked
    : ["No red-flag checklist completed"];
  const warning_signs_present = state.warning_signs_present.length
    ? state.warning_signs_present
    : []; // intentionally empty — the renderer prints "none reported"

  // Current guidance + seek_care_if come from the latest guidance card
  // emitted by the model. If guidance was never produced (e.g. the user
  // clicked "Create doctor summary" mid-intake), we say so plainly
  // rather than inventing advice.
  const current_guidance =
    state.guidance
      ? `${state.guidance.care_level.toUpperCase()} · ${state.guidance.why}`
      : "Guidance not yet generated — consider continuing the consultation before sharing this summary.";
  const seek_care_if = state.guidance?.seek_care_if?.length
    ? state.guidance.seek_care_if
    : [
        "Symptoms worsen, change in character, or persist beyond expected duration",
        "Any new warning sign appears (shortness of breath, chest pressure, fainting, severe pain, neurological changes)",
      ];

  // Build the card. `generated_at` is ISO-8601 in UTC so it round-trips
  // through JSON unambiguously.
  const card: DoctorSummaryCard = {
    kind: "doctor_summary",
    chief_complaint: chief,
    duration,
    ...(severity !== undefined ? { severity } : {}),
    red_flags_checked,
    warning_signs_present,
    current_guidance,
    seek_care_if,
    generated_at: new Date().toISOString(),
  };
  return card;
}

/**
 * Serialise a doctor_summary card into the `[card:doctor_summary] {...}
 * [/card]` wire form the client's CardRenderer expects. Returned as a
 * complete string ready to be wrapped in a single SSE delta.
 */
export function serializeDoctorSummaryCard(card: DoctorSummaryCard): string {
  return `\n[card:doctor_summary]\n${JSON.stringify(card)}\n[/card]\n`;
}

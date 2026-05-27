/**
 * Context-switch classifier — decides whether a new user turn changes
 * the topic or patient mid-flow.
 *
 * AI-first contract: the SYSTEM_PROMPT already instructs the model to
 * emit a `context_switch` card when it spots a topic change. This
 * file provides the runtime hint MedOS sends to make the decision
 * cheap and reliable even when the inference model is not yet
 * fine-tuned for the new prompt:
 *
 *   - On every request, the orchestrator computes the cheapest
 *     possible signal (chief-complaint similarity to the new turn)
 *     and stamps it into the request as `flow.context_switch_hint`.
 *   - The model is free to disagree — if it has stronger signal that
 *     this is still the same flow, it just keeps emitting intake
 *     cards. The hint is a nudge, not a rule.
 *   - When OllaBridge serves a properly retrained model, this file
 *     can be replaced by a separate `/v1/chat/completions` classifier
 *     call. The interface stays the same.
 *
 * Deliberately conservative: false positives (re-asking "is this a
 * new question?") are worse than false negatives (an extra intake
 * turn). The thresholds below were tuned to flag only obvious
 * subject/topic pivots — "my child has fever" while triaging adult
 * chest pain — and to stay silent on legitimate continuations
 * ("the pain moved to my arm now").
 */

import type { DerivedState } from "./conversation-state";

export interface ContextSwitchHint {
  /** Crude likelihood [0..1] that the new user turn introduces a new
   *  topic. The orchestrator just stamps the number; the LLM decides
   *  how to use it. */
  likelihood: number;
  /** Human-readable reason — useful for audit logs. */
  reason: string;
  /** Heuristic guess at whether the new patient is different. */
  new_patient_likely: boolean;
}

const SUBJECT_PIVOT = /\b(my\s+child|my\s+kid|my\s+son|my\s+daughter|my\s+baby|my\s+infant|newborn)\b/i;
const SELF_PIVOT = /\b(i\s+have|i\s+feel|my\s+(?!child|kid|son|daughter|baby|infant)\w+)\b/i;
const NEW_SYMPTOM = /\b(fever|cough|rash|vomiting|diarr?h(o)?ea|headache|chest|back|stomach|sore\s+throat|earache|dizz|pain)\b/i;

/**
 * Compute a context-switch hint for `newUserText` given the state
 * derived from the prior conversation. Pure function — no I/O.
 */
export function classifyContextSwitch(
  newUserText: string,
  state: DerivedState,
): ContextSwitchHint {
  // No prior flow → no switch is possible.
  if (!state.has_started_flow || !state.active_topic) {
    return { likelihood: 0, reason: "no prior flow", new_patient_likely: false };
  }
  // Trivial — the message is purely structured (action tag with no
  // free-text payload). Definitely not a switch.
  const cleaned = newUserText.replace(/<action\s+[^>]*\/>/gi, "").trim();
  if (cleaned.length === 0) {
    return { likelihood: 0, reason: "action-only turn", new_patient_likely: false };
  }

  let score = 0;
  const reasons: string[] = [];
  let newPatient = false;

  // 1. Subject pivot — speaker now refers to a different patient.
  if (state.patient_subject === "self" && SUBJECT_PIVOT.test(cleaned)) {
    score += 0.55;
    newPatient = true;
    reasons.push("subject pivot: self → child/baby");
  } else if (
    (state.patient_subject === "child" || state.patient_subject === "baby") &&
    SELF_PIVOT.test(cleaned) &&
    !SUBJECT_PIVOT.test(cleaned)
  ) {
    score += 0.45;
    newPatient = true;
    reasons.push("subject pivot: child/baby → self");
  }

  // 2. Symptom-keyword change — the user names a new symptom.
  const newSymptomMatch = cleaned.match(NEW_SYMPTOM);
  if (newSymptomMatch) {
    const newSymptom = newSymptomMatch[0].toLowerCase();
    const topicLower = state.active_topic.toLowerCase();
    if (!topicLower.includes(newSymptom)) {
      score += 0.4;
      reasons.push(`new symptom keyword: ${newSymptom}`);
    }
  }

  // 3. Length cue — a long full-sentence turn mid-intake is more
  //    likely a topic change than a chip-answer continuation.
  if (state.intake_answers.length > 0 && cleaned.split(/\s+/).length >= 8) {
    score += 0.1;
    reasons.push("long free-text turn during intake");
  }

  return {
    likelihood: Math.min(score, 1),
    reason: reasons.join("; ") || "no signals",
    new_patient_likely: newPatient,
  };
}

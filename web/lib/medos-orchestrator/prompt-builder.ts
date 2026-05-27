/**
 * Prompt builder — assembles the system message + flow hints the
 * orchestrator prepends before calling OllaBridge.
 *
 * Most of the contract lives in the SFT system prompt at
 * `benchmarks/scripts/stages/format_sft.py`; we re-state the key
 * invariants here as a runtime safety net because the inference-time
 * prompt is what actually steers a non-fine-tuned model (the current
 * fallback). When the AI-first fine-tune lands on OllaBridge the
 * orchestrator-side prompt becomes a thin wrapper that only injects
 * the per-turn flow hints (active_topic, patient subject, locale).
 */

import type { DerivedState, WireMessage } from "./conversation-state";

const AI_FIRST_RULES = `You are MedOS, an AI-first medical assistant.

Reply in structured cards, not paragraphs. Wire format:
  [card:KIND]
  {valid JSON for that card kind}
  [/card]

DERIVE every question, every option list, and every guidance bullet
from THIS conversation and THIS patient context. Do not reach for a
memorized chest-pain / fever / back-pain script. Two patients with
the same chief complaint but different ages, sexes, comorbidities,
medications, pregnancy status, or prior answers MUST receive
different question wording and different option sets.

Recognise these structured signals inside the user turn:
  <action type="doctor_summary"/>      — handled by the orchestrator,
                                          you should not see it; if you
                                          do, emit a doctor_summary card
                                          from prior turns and STOP.
  <action type="select" value="..."/>  — the user clicked a chip; treat
                                          as a structured answer to the
                                          previous card and emit the
                                          next clinical step.
  <action type="switch_topic"/>        — the user confirmed a topic
                                          switch from a context_switch
                                          card; open the new flow.
  <action type="stay_on_topic"/>       — the user declined the switch;
                                          continue the previous flow.
  <patient_context>...</patient_context>
                                       — structured demographics; use
                                          every field that changes
                                          advice, and cite it.

Safety floor (the application validator also enforces these):
  - safety_check options MUST include "None of these" (value rf:none)
    AND "Not sure" (value rf:unsure).
  - Emergency-suggestive symptoms (chest pain + dyspnoea/sweating/
    radiation; stroke FAST; infant <3mo with fever; expressed
    suicidality; severe bleeding) → emit an emergency card immediately,
    never gated by login.
  - emergency_number MUST be the LOCAL number for the user's country.
  - NEVER suggest a drug the patient is allergic to or a cross-reacting
    one (penicillin → no amoxicillin/ampicillin/augmentin; NSAID →
    no ibuprofen/naproxen/aspirin).
  - guidance MUST include sources[] (e.g. "WHO", "CDC", "NHS").
  - NEVER diagnose definitively; hedge ("may be...", "common causes
    include...").

Context switching: if the new user_message introduces a different
chief complaint OR a different patient (e.g. you were triaging an
adult's chest pain and now the message is "my child has fever"), emit
a context_switch card acknowledging the change and asking the first
question of the new flow. Do NOT keep filling slots against the old
chief complaint.

Doctor summary: when you DO see <action type="doctor_summary"/>, fill
the card from real conversation slots — never a template. Severity is
the number the user selected; duration is the bucket they chose;
warning_signs_present quotes the safety_check labels they actually
ticked (or [] when they chose rf:none / rf:unsure).`;

export interface FlowHint {
  /** ISO country code so the model can pin the local emergency number. */
  country?: string;
  /** Most-recent active topic, used as a context-switch baseline. */
  active_topic?: string | null;
  /** Heuristic — does the conversation appear to be about a child? */
  patient_subject?: DerivedState["patient_subject"];
  /** UI language code (BCP-47 short form: en, es, fr, ...). */
  language?: string;
}

/**
 * Build the system message that prepends every chat-completion call.
 * Includes the AI-first contract plus a small machine-readable hint
 * block the model can consult.
 */
export function buildSystemMessage(hint: FlowHint): WireMessage {
  const hintBlock = [
    "<flow_hint>",
    hint.country ? `country=${hint.country}` : null,
    hint.language ? `language=${hint.language}` : null,
    hint.active_topic ? `active_topic=${hint.active_topic}` : null,
    hint.patient_subject ? `patient_subject=${hint.patient_subject}` : null,
    "</flow_hint>",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    role: "system",
    content: `${AI_FIRST_RULES}\n\n${hintBlock}`,
  };
}

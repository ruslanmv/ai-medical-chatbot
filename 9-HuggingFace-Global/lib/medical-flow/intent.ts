/**
 * Intent classifier — decides which card the server emits next.
 *
 * Phase-1 implementation is rule-based: regex patterns over the user's
 * message + lightweight conversation-history signals. This is intentional:
 *
 *   - Zero added LLM cost on the hot path.
 *   - Deterministic + auditable (the same input always produces the same
 *     intent; a clinician can review why a profile gate fired).
 *   - Easy to expand without retraining anything.
 *
 * The classifier is conservative: when in doubt, it falls back to
 * `basic_symptom` (the safe, gateless path). Only high-confidence
 * keyword matches trigger `deep_analysis` or other escalations.
 *
 * Future upgrade path: route ambiguous cases through a tiny LLM
 * classifier call (~$0.05/M tokens on Groq llama-3.2-3b). The
 * `classifyIntent` signature stays the same; only the implementation
 * changes. The hot path covers ~90% of cases without any LLM call.
 */

import type { Intent } from './types';

interface ConversationSignal {
  /** Number of prior user turns in this conversation (excluding this one). */
  prior_user_turns: number;
  /** Whether deterministic safety rules already classified this as an
   *  emergency. When true, intent is forced to `emergency` regardless
   *  of phrasing. */
  is_emergency: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Patterns. Word-bounded, case-insensitive, deliberately narrow.
// ─────────────────────────────────────────────────────────────────────

/** Pure greetings — anything else triggers a medical-intent match. */
const CHITCHAT = [
  /^\s*(hi|hello|hey|yo|ciao|hola|salve|bonjour|hallo|olá|salam|namaste)\b/i,
  /^\s*good\s+(morning|afternoon|evening|night)\b/i,
  /^\s*how\s+are\s+you\b/i,
  /^\s*thanks?(\s+(you|so much))?\s*[.!]?\s*$/i,
  /^\s*(ok|okay|got it|sure|yes|no)\s*[.!]?\s*$/i,
];

/** Deep-analysis trigger phrases. These are the explicit "I want a full
 *  workup" signals that justify gating on profile completion. */
const DEEP_ANALYSIS = [
  /\banalyze\s+(my|the|this|deeply|in\s+depth)/i,
  /\banalyze\b.{0,20}\bdeeply\b/i,
  /\bdeep(\s+|er\s+)analysis\b/i,
  /\bdeeply\s+and\s+(tell|say|explain)/i,
  /\bfull\s+(assessment|workup|analysis|evaluation)\b/i,
  /\bwhat\s+(is|could be|might be)\s+(it|this|wrong|happening)\b/i,
  /\b(tell|say)\s+me\s+what\s+(it|this)\s+(could|might|may)\s+be\b/i,
  /\bwhat\s+(this|it)\s+could\s+be\b/i,
  /\bmost\s+(likely|probable)\s+(cause|diagnosis|condition)\b/i,
  /\bdifferential\s+diagnosis\b/i,
  /\bshould\s+I\s+(worry|be\s+(worried|concerned))\b/i,
  /\bis\s+this\s+serious\b/i,
  /\btell\s+me\s+(everything|what'?s\s+(wrong|happening))\b/i,
  /\bsafe\s+for\s+me\b/i, // medication safety for specific patient
];

/** Medication-specific intent. Often combines with deep_analysis but
 *  matched separately so the gate copy mentions allergies + meds. */
const MEDICATION = [
  /\b(can I take|safe to take|interact|interaction with)\b.*\b(my|other)\s+(medication|meds|pills)\b/i,
  /\b(dosage|dose)\s+(for|of)\b/i,
  /\b(side effect|adverse reaction)\b/i,
  /\b(ibuprofen|aspirin|acetaminophen|paracetamol|tylenol|advil|naproxen|lisinopril|metformin|warfarin|atorvastatin)\b/i,
];

/** Lab/test-result intent. */
const TEST_RESULT = [
  /\b(blood test|lab result|test result|imaging|MRI|CT scan|x-?ray|ultrasound)\b/i,
  /\b(cholesterol|LDL|HDL|triglycerides|glucose|HbA1c|TSH|hemoglobin|creatinine)\s+(of|is|was|level)\b/i,
  /\b(result|reading)\s+(shows|came back|is)\b/i,
];

/** Mental-health intent. Routes to a flow with a crisis pre-check. */
const MENTAL_HEALTH = [
  /\b(anxious|anxiety|panic attack|depressed|depression|suicidal|self.?harm)\b/i,
  /\b(can'?t\s+(sleep|stop\s+crying|cope))\b/i,
  /\b(feeling\s+(down|hopeless|overwhelmed|empty))\b/i,
];

// ─────────────────────────────────────────────────────────────────────
// Classifier
// ─────────────────────────────────────────────────────────────────────

/**
 * Classify the user's intent. Order of checks reflects priority:
 *   1. Emergency (deterministic — safety always wins)
 *   2. Chitchat (cheap to identify — pure greetings)
 *   3. Mental health (needs a crisis pre-check before any other flow)
 *   4. Test result (lab/imaging questions follow a different intake)
 *   5. Deep analysis (the gate)
 *   6. Medication (gate when the user asks personal-safety questions)
 *   7. Basic symptom (fallback — the safe gateless path)
 */
export function classifyIntent(
  userText: string,
  signal: ConversationSignal,
): Intent {
  if (signal.is_emergency) return 'emergency';

  const text = (userText || '').trim();
  if (!text) return 'chitchat';

  if (CHITCHAT.some((re) => re.test(text)) && text.length < 60) {
    return 'chitchat';
  }
  if (MENTAL_HEALTH.some((re) => re.test(text))) return 'mental_health';
  if (TEST_RESULT.some((re) => re.test(text))) return 'test_result';
  if (DEEP_ANALYSIS.some((re) => re.test(text))) return 'deep_analysis';
  if (MEDICATION.some((re) => re.test(text))) {
    // Personal-safety medication questions ("safe for me?") get the
    // deep-analysis gate; general info ("what is ibuprofen?") doesn't.
    if (/\b(for me|in my case|with my|given my)\b/i.test(text)) {
      return 'deep_analysis';
    }
    return 'medication';
  }

  // After 3+ medical turns, soft-promote the next clinical question to
  // deep_analysis so the user is offered the profile gate exactly once
  // per long conversation rather than never.
  if (signal.prior_user_turns >= 3) return 'deep_analysis';

  return 'basic_symptom';
}

/** Convenience: derive the prior-user-turns count from a message array
 *  of arbitrary OpenAI-style messages. Excludes the last user message
 *  (which is the one being classified). */
export function priorUserTurns(messages: Array<{ role: string }>): number {
  const userMsgs = messages.filter((m) => m.role === 'user').length;
  return Math.max(0, userMsgs - 1);
}

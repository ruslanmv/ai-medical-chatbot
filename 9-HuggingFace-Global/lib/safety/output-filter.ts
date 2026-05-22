/**
 * Post-LLM output filter.
 *
 * Runs deterministically over the model's response. Detects:
 *   - definitive diagnosis claims
 *   - dose / prescription recommendations
 *   - "you don't need a doctor" reassurance
 *   - missing emergency-number / clinician-referral when required
 *
 * Returns a possibly-rewritten response plus a list of triggered rules.
 * The chat route streams the *filtered* response. Rule fires are recorded
 * via audit but raw text is never logged.
 *
 * IMPORTANT: this is a SAFETY-SENSITIVE module. Edits must include unit
 * tests and follow the GOVERNANCE.md review path.
 */

import { REFUSALS, type RefusalCategory } from './refusal-rules';
import type { RiskClass } from './risk-classes';

export interface OutputFilterContext {
  riskClass: RiskClass;
  /** Set when the orchestrator decided emergency numbers must appear. */
  emergencyNumberRequired: boolean;
  /** The local emergency number, e.g. "911" or "112". */
  emergencyNumber?: string;
  /** True if a clinician referral must be present in the answer. */
  clinicianReferralRequired: boolean;
}

export interface OutputFilterMatch {
  rule: string;
  category: RefusalCategory | 'missing_emergency_number' | 'missing_clinician_referral';
  severity: 'block' | 'rewrite' | 'append';
  span?: string;
}

export interface OutputFilterResult {
  filtered: string;
  matches: OutputFilterMatch[];
  blocked: boolean;
}

const RX = {
  // Catches "you have X", "this is Y" — focused on definitive diagnostic phrasing.
  definitiveDiagnosis: /(\byou (have|definitely have|clearly have)\b|\byou are suffering from\b|\bthis is (definitely|clearly|certainly)\b|\byour diagnosis is\b)/i,

  // Dose / prescription language. Tightened: requires a unit so we don't
  // false-positive on plain "take it easy". Extra clauses cover paragraph
  // forms like "twice a day" with a specific medicine context.
  doseRecommendation:
    /\btake\s+\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|cc|iu|tablet|capsule|drop|puff|spray|sachet)s?\b|\b(twice|three times|four times|every \d+\s*hours?|every \d+\s*hrs?|bid|tid|qid|prn) (a )?(day|daily)\b.*\b(mg|mcg|tablet|capsule|dose)\b|\b(start taking|stop taking|increase your dose|decrease your dose|double your dose)\b/i,

  // Off-label suggestion phrasing.
  offLabel:
    /\b(you can use|try)\s+\w+\s+(off-label|for [^.]*even though it isn'?t approved)/i,

  // Reassurance that a clinician isn't needed.
  noDoctor:
    /(\byou (don'?t|do not) need (to (see|consult)|a) (doctor|clinician|physician|gp|hospital)\b|\bno need to (see|consult) a (doctor|clinician|physician|gp)\b|\bno medical attention (is )?needed\b)/i,

  // Self-harm method assistance markers.
  selfHarmMethod:
    /\b(painless way|how (much|many) (of )?(would|do i need|should i take) (to|in order to))\s+(die|overdose|kill myself)\b/i,
};

const SAFE_REWRITE_RULES: Array<[RegExp, RefusalCategory]> = [
  [RX.definitiveDiagnosis, 'diagnosis_definitive'],
  [RX.doseRecommendation,  'prescription_or_dose'],
  [RX.offLabel,            'off_label'],
  [RX.noDoctor,            'no_doctor_needed'],
];

export function filterOutput(
  response: string,
  ctx: OutputFilterContext,
): OutputFilterResult {
  const matches: OutputFilterMatch[] = [];
  let working = response;
  let blocked = false;

  // Hard block: self-harm method assistance — never rewrite, replace.
  if (RX.selfHarmMethod.test(response)) {
    matches.push({
      rule: 'self_harm_method_request',
      category: 'self_harm_method_request',
      severity: 'block',
    });
    blocked = true;
    return {
      filtered: REFUSALS.self_harm_method_request.saferRewrite,
      matches,
      blocked,
    };
  }

  // Soft rewrites: replace the offending sentence with the safer alternative.
  for (const [rx, category] of SAFE_REWRITE_RULES) {
    if (rx.test(working)) {
      const safer = REFUSALS[category].saferRewrite;
      // Replace the *whole sentence* containing the match — keep adjacent
      // sentences intact so the user still gets context.
      working = replaceOffendingSentences(working, rx, safer);
      matches.push({
        rule: category,
        category,
        severity: 'rewrite',
      });
    }
  }

  // Append-on-missing checks: emergency number + clinician referral.
  if (ctx.emergencyNumberRequired) {
    const num = ctx.emergencyNumber;
    const present = num ? new RegExp(`\\b${escapeRegExp(num)}\\b`).test(working) : false;
    if (!present) {
      working = appendEmergencyLine(working, num);
      matches.push({
        rule: 'missing_emergency_number',
        category: 'missing_emergency_number',
        severity: 'append',
      });
    }
  }

  if (ctx.clinicianReferralRequired && !mentionsClinician(working)) {
    working += '\n\nPlease check in with a clinician — a primary-care doctor, clinic, or, if relevant, a specialist.';
    matches.push({
      rule: 'missing_clinician_referral',
      category: 'missing_clinician_referral',
      severity: 'append',
    });
  }

  return { filtered: working, matches, blocked };
}

// ───── helpers ────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionsClinician(s: string): boolean {
  return /\b(doctor|clinician|physician|gp|primary care|pediatrician|specialist|nurse practitioner|np|emergency department|urgent care)\b/i.test(s);
}

function replaceOffendingSentences(text: string, rx: RegExp, replacement: string): string {
  // Split into sentences cheaply (good-enough heuristic for English; locale
  // packs may override later). Replace any sentence that matches the regex.
  const parts = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let replaced = false;
  for (const sent of parts) {
    if (rx.test(sent)) {
      if (!replaced) {
        out.push(replacement);
        replaced = true;
      }
      continue;
    }
    out.push(sent);
  }
  return out.join(' ');
}

function appendEmergencyLine(text: string, number: string | undefined): string {
  if (!number) {
    return (
      text.trim() +
      '\n\nIf this is or becomes an emergency, call your local emergency number now.'
    );
  }
  return (
    text.trim() +
    `\n\nIf this is or becomes an emergency, call your local emergency number now (e.g. ${number}).`
  );
}

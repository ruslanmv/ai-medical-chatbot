/**
 * Deterministic red-flag rules.
 *
 * Each rule is identified, has a stable id, a deterministic match function,
 * a default risk class, and a category. The match function is pure code —
 * the LLM has no part in firing or suppressing it.
 *
 * The legacy triageMessage() in triage.ts handles a curated multilingual
 * keyword set today. This file extends that with structured rules that
 * include patient-context modifiers (age, pregnancy, etc.) so the
 * orchestrator can reach the right risk class even when the keyword set
 * is ambiguous.
 *
 * IMPORTANT: changes here are SAFETY-SENSITIVE under GOVERNANCE.md and
 * require a clinical advisor sign-off before merge.
 */

import type { RiskClass } from './risk-classes';

export type RedFlagCategory =
  | 'cardiovascular_emergency'
  | 'stroke'
  | 'respiratory_emergency'
  | 'anaphylaxis'
  | 'severe_bleeding'
  | 'loss_of_consciousness'
  | 'suicidal_ideation'
  | 'pregnancy_emergency'
  | 'infant_fever'
  | 'pediatric_severe'
  | 'poisoning_overdose'
  | 'severe_pain_with_signs'
  | 'sepsis_signs'
  | 'neurological_acute';

export interface PatientContext {
  /** Age in years; if a younger age is known, set ageYears to a fraction or use ageMonths. */
  ageYears?: number;
  ageMonths?: number;
  /** True if user mentions current pregnancy. */
  pregnant?: boolean;
  /** True if the message is about an infant (set by extractor). */
  isInfant?: boolean;
}

export interface RedFlagMatch {
  ruleId: string;
  category: RedFlagCategory;
  riskClass: RiskClass;
  /** Short, neutral description — no PHI. */
  reason: string;
  /** Optional template guidance to surface to the user. */
  guidance?: string;
}

export interface RedFlagRule {
  id: string;
  category: RedFlagCategory;
  /** Default risk class when this rule fires alone. */
  riskClass: RiskClass;
  /** Pure-function matcher. */
  match: (text: string, ctx: PatientContext) => boolean;
  reason: string;
  guidance?: string;
}

const lc = (s: string) => s.toLowerCase();
const includesAny = (haystack: string, needles: string[]) =>
  needles.some((n) => haystack.includes(n));

// ───── Cardiovascular ────────────────────────────────────────────────────
//
// IMPORTANT — bare "chest pain" is intentionally NOT in this rule any
// more. The user feedback was clear: an unqualified single complaint
// like "I have chest pain" should NOT trigger the R5 emergency template
// immediately. The AI should investigate first. The CHEST_PAIN flow in
// lib/medical-flow/symptoms.ts handles bare mentions via a structured
// safety_check checklist; if the patient picks any genuine red flag
// from the checklist, the flow emits the emergency guidance card on
// the NEXT turn. That keeps the safety floor strict for confirmed ACS
// presentations without crying wolf on the bare two-word complaint.
//
// What stays as a hard R5 here:
//   - Explicit emergency CLAIMS (the patient is asserting the
//     diagnosis, not exploring a symptom): "heart attack", "MI",
//     "I'm having a heart attack".
//   - Multi-term ACS combinations that arrive in a single message
//     (chest pain + radiating, chest pain + jaw, chest pain + sweating,
//     crushing chest, pressure in chest + dyspnea, …).

// Explicit-claim phrases — fire R5 immediately.
const EXPLICIT_CARDIO_CLAIMS = [
  'heart attack',
  'mi symptoms',
  "i'm having a heart attack",
  'cardiac arrest',
];

// ACS qualifier set. To fire R5 on chest symptoms, the message MUST
// contain BOTH a chest term AND at least one qualifier from this list.
const CHEST_SYMPTOM_TERMS = [
  'chest pain',
  'chest pressure',
  'crushing chest',
  'tight chest',
  'pressure in my chest',
  'pressure in chest',
  'chest squeezing',
  'chest tightness',
];
const ACS_QUALIFIERS = [
  'radiating', 'radiates', 'radiate',
  'left arm', 'right arm', 'down my arm',
  'jaw', 'neck',
  'sweating', 'cold sweat',
  'shortness of breath', 'short of breath',
  "can't breathe", 'cant breathe', 'trouble breathing', 'difficulty breathing',
  'fainting', 'passed out', 'syncope', 'collapse',
  'crushing', 'squeezing',
  'nausea and chest', 'vomiting and chest',
];

const CARDIO_RULE: RedFlagRule = {
  id: 'RF-CARDIO-01',
  category: 'cardiovascular_emergency',
  riskClass: 'R5',
  reason: 'Confirmed cardiac emergency presentation (explicit claim OR chest symptom + ACS qualifier).',
  guidance:
    'This may be a heart attack. Call your local emergency number immediately. ' +
    'While waiting: sit upright, stay calm, loosen tight clothing. ' +
    'Chew aspirin only if you are not allergic and a clinician has previously advised it.',
  match: (text) => {
    const t = lc(text);
    // Path A: explicit claim — fires alone.
    if (includesAny(t, EXPLICIT_CARDIO_CLAIMS)) return true;
    // Path B: chest symptom + ACS qualifier must BOTH be present.
    const hasChestSymptom = includesAny(t, CHEST_SYMPTOM_TERMS);
    if (!hasChestSymptom) return false;
    return includesAny(t, ACS_QUALIFIERS);
  },
};

// ───── Stroke ────────────────────────────────────────────────────────────

const STROKE_TERMS = [
  'face drooping', 'one side of my face', 'arm weakness', 'arm went numb',
  'slurred speech', 'sudden confusion', 'sudden severe headache',
  'worst headache of my life', 'can\'t move one side', 'cant move one side',
  'stroke symptoms',
];

const STROKE_RULE: RedFlagRule = {
  id: 'RF-STROKE-01',
  category: 'stroke',
  riskClass: 'R5',
  reason: 'Stroke / FAST symptoms detected.',
  guidance:
    'Stroke symptoms — Face droop, Arm weakness, Speech difficulty. Call your ' +
    'local emergency number immediately. Note the exact time symptoms started.',
  match: (text) => includesAny(lc(text), STROKE_TERMS),
};

// ───── Respiratory ──────────────────────────────────────────────────────

const RESP_TERMS = [
  'can\'t breathe', 'cant breathe', 'cannot breathe', 'severe shortness of breath',
  'choking', 'turning blue', 'lips blue', 'gasping for air',
];

const RESP_RULE: RedFlagRule = {
  id: 'RF-RESP-01',
  category: 'respiratory_emergency',
  riskClass: 'R5',
  reason: 'Severe respiratory distress detected.',
  guidance: 'Severe breathing difficulty is a medical emergency. Call your local emergency number now.',
  match: (text) => includesAny(lc(text), RESP_TERMS),
};

// ───── Anaphylaxis ──────────────────────────────────────────────────────

const ANAPHYLAXIS_TERMS = [
  'throat swelling', 'tongue swelling', 'allergic reaction with breathing',
  'hives all over', 'anaphylaxis', 'epipen',
];

const ANAPH_RULE: RedFlagRule = {
  id: 'RF-ANAPH-01',
  category: 'anaphylaxis',
  riskClass: 'R5',
  reason: 'Possible anaphylaxis (airway involvement).',
  guidance:
    'Anaphylaxis is a medical emergency. If an epinephrine auto-injector ' +
    '(EpiPen) is available, use it now. Call your local emergency number.',
  match: (text) => includesAny(lc(text), ANAPHYLAXIS_TERMS),
};

// ───── Severe bleeding / LOC ────────────────────────────────────────────

const BLEED_RULE: RedFlagRule = {
  id: 'RF-BLEED-01',
  category: 'severe_bleeding',
  riskClass: 'R5',
  reason: 'Uncontrolled / severe bleeding mentioned.',
  guidance:
    'Apply firm pressure with a clean cloth. Elevate the limb if possible. ' +
    'Call your local emergency number now.',
  match: (text) =>
    includesAny(lc(text), [
      'severe bleeding', 'heavy bleeding', 'bleeding wont stop',
      'bleeding will not stop', 'uncontrolled bleeding', 'spurting blood',
    ]),
};

const LOC_RULE: RedFlagRule = {
  id: 'RF-LOC-01',
  category: 'loss_of_consciousness',
  riskClass: 'R5',
  reason: 'Loss of consciousness / unresponsive person.',
  guidance:
    'If a person is unresponsive, call your local emergency number. Check breathing. ' +
    'If trained, begin CPR. Place on their side if breathing.',
  match: (text) =>
    includesAny(lc(text), [
      'unconscious', 'unresponsive', 'passed out', 'fainted and not waking',
      'not breathing',
    ]),
};

// ───── Mental health crisis ─────────────────────────────────────────────

const SUICIDE_RULE: RedFlagRule = {
  id: 'RF-MH-01',
  category: 'suicidal_ideation',
  riskClass: 'R5',
  reason: 'Suicidal ideation or self-harm intent.',
  guidance:
    'You are not alone. Help is available right now. Please call your local emergency ' +
    'number or a crisis line. If you have a trusted person nearby, reach out to them.',
  match: (text) =>
    includesAny(lc(text), [
      'kill myself', 'want to die', 'end my life', 'suicide', 'suicidal',
      'no reason to live', 'better off dead',
    ]),
};

// ───── Pregnancy emergency ──────────────────────────────────────────────

const PREGNANCY_RULE: RedFlagRule = {
  id: 'RF-PREG-01',
  category: 'pregnancy_emergency',
  riskClass: 'R4',
  reason: 'Pregnancy with concerning symptoms.',
  guidance:
    'Pregnancy with bleeding, severe abdominal pain, severe headache or visual changes, ' +
    'or decreased fetal movement is a reason to be evaluated urgently. Contact your ' +
    'maternity provider now or go to an emergency department.',
  match: (text, ctx) => {
    const t = lc(text);
    const isPregContext = ctx.pregnant === true || /\bpregnan/.test(t);
    if (!isPregContext) return false;
    return includesAny(t, [
      'bleeding', 'severe abdominal', 'severe headache', 'vision changes',
      'no fetal movement', 'baby not moving', 'leaking fluid', 'contractions',
    ]);
  },
};

// ───── Infant fever ─────────────────────────────────────────────────────

const INFANT_FEVER_RULE: RedFlagRule = {
  id: 'RF-INFANT-01',
  category: 'infant_fever',
  riskClass: 'R4',
  reason: 'Infant under 3 months with fever.',
  guidance:
    'Any fever (≥ 38.0 °C / 100.4 °F) in an infant under 3 months is an urgent reason ' +
    'for medical evaluation. Contact your pediatric emergency line or go to an emergency ' +
    'department now.',
  match: (text, ctx) => {
    const t = lc(text);
    const ageMonths = ctx.ageMonths ?? (ctx.ageYears != null ? ctx.ageYears * 12 : undefined);
    const isInfant =
      ctx.isInfant === true ||
      (ageMonths != null && ageMonths < 3) ||
      /\b(newborn|2 month old|two month old|six week old|6 week old|8 week old|eight week old)\b/.test(t);
    if (!isInfant) return false;
    return /(fever|temperature|hot|burning up|38(\.\d)?\s*c|100(\.\d)?\s*f|39\s*c|40\s*c)/.test(t);
  },
};

// ───── Pediatric severe ─────────────────────────────────────────────────

const PEDIATRIC_RULE: RedFlagRule = {
  id: 'RF-PEDS-01',
  category: 'pediatric_severe',
  riskClass: 'R4',
  reason: 'Severe pediatric symptoms.',
  guidance:
    'Severe symptoms in a child — breathing trouble, repeated seizures, very few wet diapers, ' +
    'a non-blanching rash, or unresponsiveness — require urgent evaluation. Call your local ' +
    'emergency number or go to a pediatric emergency department.',
  match: (text, ctx) => {
    const ageYears = ctx.ageYears;
    const t = lc(text);
    const isChild =
      (ageYears != null && ageYears < 18) ||
      ctx.isInfant === true ||
      /\b(child|baby|infant|toddler|my son|my daughter|my kid)\b/.test(t);
    if (!isChild) return false;
    return includesAny(t, [
      'non-blanching rash', 'purple spots', 'seizure', 'no wet diapers',
      'unresponsive', 'lethargic', 'limp', 'stiff neck',
    ]);
  },
};

// ───── Poisoning / overdose ─────────────────────────────────────────────

const POISON_RULE: RedFlagRule = {
  id: 'RF-POISON-01',
  category: 'poisoning_overdose',
  riskClass: 'R5',
  reason: 'Poisoning or overdose mentioned.',
  guidance:
    'Call your local emergency number or poison-control line immediately. Do not induce ' +
    'vomiting unless explicitly told to. Have the substance container ready to describe.',
  match: (text) =>
    includesAny(lc(text), [
      'overdose', 'overdosed', 'took too many', 'swallowed bleach', 'swallowed pesticide',
      'drank chemicals', 'poisoned',
    ]),
};

// ───── Sepsis signs (adult) ─────────────────────────────────────────────

const SEPSIS_RULE: RedFlagRule = {
  id: 'RF-SEPSIS-01',
  category: 'sepsis_signs',
  riskClass: 'R4',
  reason: 'Constellation of features concerning for sepsis.',
  guidance:
    'High fever with confusion, very fast breathing, mottled skin, or severe lethargy can ' +
    'indicate sepsis — a medical emergency. Seek urgent evaluation now.',
  match: (text) => {
    const t = lc(text);
    return /(\bfever\b|\bvery hot\b)/.test(t) && includesAny(t, ['confusion', 'mottled', 'very fast breathing', 'severely lethargic']);
  },
};

export const RED_FLAG_RULES: RedFlagRule[] = [
  CARDIO_RULE,
  STROKE_RULE,
  RESP_RULE,
  ANAPH_RULE,
  BLEED_RULE,
  LOC_RULE,
  SUICIDE_RULE,
  PREGNANCY_RULE,
  INFANT_FEVER_RULE,
  PEDIATRIC_RULE,
  POISON_RULE,
  SEPSIS_RULE,
];

/**
 * Run all rules. Returns every match (so audit can record overlapping fires)
 * along with the highest risk class.
 */
export function evaluateRedFlags(
  text: string,
  ctx: PatientContext = {},
): { matches: RedFlagMatch[]; topRisk: RiskClass } {
  const matches: RedFlagMatch[] = [];
  for (const rule of RED_FLAG_RULES) {
    if (rule.match(text, ctx)) {
      matches.push({
        ruleId: rule.id,
        category: rule.category,
        riskClass: rule.riskClass,
        reason: rule.reason,
        guidance: rule.guidance,
      });
    }
  }
  let topRisk: RiskClass = 'R0';
  const order = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'] as const;
  for (const m of matches) {
    if (order.indexOf(m.riskClass) > order.indexOf(topRisk)) topRisk = m.riskClass;
  }
  return { matches, topRisk };
}

/**
 * Symptom-specific flow definitions.
 *
 * Each entry maps a triggering pattern (regex) to:
 *   - a safety_check card with that symptom's red-flag checklist
 *   - an ordered list of intake questions (location / duration / severity)
 *
 * This is intentionally a flat config table, not a state machine: the
 * route handler advances the user through it linearly based on what
 * fields are already in the conversation history. Adding a new symptom
 * is one config entry — no code change.
 *
 * Trigger patterns are conservative on purpose. False positives (e.g.
 * "I have a back" matching the back-pain trigger by accident) get an
 * unhelpful checklist; false negatives just fall through to the
 * existing bubble flow, which still works. Both modes degrade safely.
 */

import type { Action, IntakeCard, SafetyCheckCard } from './types';

export interface SymptomFlow {
  id: string;
  trigger: RegExp;
  /** Returned as the safety_check card on the first turn after trigger. */
  safety: SafetyCheckCard;
  /** Each entry generates one intake card. The route advances by counting
   *  how many "assistant card turns" the user has seen so far. */
  intake_steps: Array<Omit<IntakeCard, 'kind' | 'progress'>>;
}

// ─────────────────────────────────────────────────────────────────────
// Shared intake primitives — reused across symptoms
// ─────────────────────────────────────────────────────────────────────

const DURATION_OPTIONS: Action[] = [
  { label: 'Today', value: 'selected:duration:today' },
  { label: '1–3 days', value: 'selected:duration:1-3d' },
  { label: '4–7 days', value: 'selected:duration:4-7d' },
  { label: 'More than 1 week', value: 'selected:duration:gt1w' },
  { label: 'More than 1 month', value: 'selected:duration:gt1m' },
];

const SEVERITY_SLIDER = {
  min: 0,
  max: 10,
  min_label: 'No pain',
  max_label: 'Worst pain',
} as const;

// ─────────────────────────────────────────────────────────────────────
// Back pain
// ─────────────────────────────────────────────────────────────────────

const BACK_PAIN_RED_FLAGS: Action[] = [
  { label: 'Leg weakness or numbness', value: 'rf:back:leg_weakness', style: 'danger' },
  { label: 'Loss of bladder or bowel control', value: 'rf:back:incontinence', style: 'danger' },
  { label: 'Fever', value: 'rf:back:fever', style: 'danger' },
  { label: 'Recent fall or injury', value: 'rf:back:trauma', style: 'danger' },
  { label: 'Chest pain or trouble breathing', value: 'rf:back:cardiopulmonary', style: 'danger' },
  { label: 'Severe sudden pain', value: 'rf:back:severe_sudden', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

const BACK_PAIN_LOCATION: Action[] = [
  { label: 'Lower back', value: 'selected:loc:lower' },
  { label: 'Middle back', value: 'selected:loc:middle' },
  { label: 'Upper back', value: 'selected:loc:upper' },
  { label: 'One side', value: 'selected:loc:side' },
  { label: 'Spreads down leg', value: 'selected:loc:radiates' },
  { label: 'Not sure', value: 'selected:loc:unsure' },
];

export const BACK_PAIN: SymptomFlow = {
  id: 'back-pain',
  // Matches "back pain", "pain in my back", "my back hurts", "lower back ache",
  // "back is sore / stiff", etc. Conservative: still requires the word
  // "back" near a pain/discomfort term.
  trigger:
    /\b(back\s+(pain|ache|hurts?|sore|stiff|spasm)|(pain|ache|hurts?|sore|stiff|spasm)\s+(?:in\s+)?(?:(?:my|the|lower|upper|middle)\s+)*back)\b/i,
  safety: {
    kind: 'safety_check',
    title: 'Back pain',
    question:
      "I can help with back pain. First, let's check for warning signs. Do you have any of these right now?",
    options: BACK_PAIN_RED_FLAGS,
    on_positive: 'urgent_care',
  },
  intake_steps: [
    {
      title: 'Where is the pain?',
      question: 'Where exactly do you feel the pain?',
      input_type: 'chips',
      options: BACK_PAIN_LOCATION,
    },
    {
      title: 'How long?',
      question: 'How long has it been happening?',
      input_type: 'chips',
      options: DURATION_OPTIONS,
    },
    {
      title: 'How severe?',
      question: 'On a scale from 0 to 10, how severe is the pain?',
      input_type: 'slider',
      slider: SEVERITY_SLIDER,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Headache
// ─────────────────────────────────────────────────────────────────────

const HEADACHE_RED_FLAGS: Action[] = [
  { label: 'Worst headache of my life', value: 'rf:hd:worst_ever', style: 'danger' },
  { label: 'Sudden onset (thunderclap)', value: 'rf:hd:thunderclap', style: 'danger' },
  { label: 'Vision changes', value: 'rf:hd:vision', style: 'danger' },
  { label: 'Weakness or numbness', value: 'rf:hd:weakness', style: 'danger' },
  { label: 'Fever and stiff neck', value: 'rf:hd:meningismus', style: 'danger' },
  { label: 'Recent head injury', value: 'rf:hd:trauma', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

export const HEADACHE: SymptomFlow = {
  id: 'headache',
  trigger:
    /\b(headache|migraine|head\s+(pain|hurts?|ache)|(pain|ache|hurts?)\s+(?:in\s+)?(?:my\s+|the\s+)?head)\b/i,
  safety: {
    kind: 'safety_check',
    title: 'Headache',
    question:
      "I can help with headache. First, let's check for warning signs. Do you have any of these right now?",
    options: HEADACHE_RED_FLAGS,
    on_positive: 'emergency',
  },
  intake_steps: [
    {
      title: 'How long?',
      question: 'When did this headache start?',
      input_type: 'chips',
      options: DURATION_OPTIONS,
    },
    {
      title: 'How severe?',
      question: 'On a scale from 0 to 10, how severe is it right now?',
      input_type: 'slider',
      slider: SEVERITY_SLIDER,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Stomach / abdominal pain
// ─────────────────────────────────────────────────────────────────────

const STOMACH_RED_FLAGS: Action[] = [
  { label: 'Severe pain right lower side', value: 'rf:abd:rlq', style: 'danger' },
  { label: 'Blood in stool or vomit', value: 'rf:abd:bleeding', style: 'danger' },
  { label: 'High fever (>39 °C / 102 °F)', value: 'rf:abd:fever', style: 'danger' },
  { label: 'Could be pregnant', value: 'rf:abd:pregnancy', style: 'danger' },
  { label: 'Severe vomiting (cannot keep fluids)', value: 'rf:abd:dehydration', style: 'danger' },
  { label: 'Pain worse with movement', value: 'rf:abd:peritoneal', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

const ABD_LOCATION: Action[] = [
  { label: 'Upper middle', value: 'selected:loc:epigastric' },
  { label: 'Upper right', value: 'selected:loc:ruq' },
  { label: 'Upper left', value: 'selected:loc:luq' },
  { label: 'Lower right', value: 'selected:loc:rlq' },
  { label: 'Lower left', value: 'selected:loc:llq' },
  { label: 'All over', value: 'selected:loc:diffuse' },
  { label: 'Around belly button', value: 'selected:loc:periumbilical' },
];

export const STOMACH: SymptomFlow = {
  id: 'abdominal-pain',
  trigger: /\b(stomach|belly|abdominal|tummy)\s+(pain|ache|hurts?|cramp)/i,
  safety: {
    kind: 'safety_check',
    title: 'Stomach pain',
    question:
      "Stomach pain can sometimes be urgent. Do you have any of these right now?",
    options: STOMACH_RED_FLAGS,
    on_positive: 'urgent_care',
  },
  intake_steps: [
    {
      title: 'Where is the pain?',
      question: 'Where exactly do you feel the pain?',
      input_type: 'chips',
      options: ABD_LOCATION,
    },
    {
      title: 'How long?',
      question: 'How long has it been happening?',
      input_type: 'chips',
      options: DURATION_OPTIONS,
    },
    {
      title: 'How severe?',
      question: 'On a scale from 0 to 10, how severe is the pain?',
      input_type: 'slider',
      slider: SEVERITY_SLIDER,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Stroke (FAST)
// ─────────────────────────────────────────────────────────────────────
// Triggered by FAST presentation patterns. The "safety check" is a
// FAST-criteria checklist; any positive answer goes straight to the
// emergency card. The intake_steps array is empty — there is no
// "how long has this been happening" round after FAST.

const STROKE_RED_FLAGS: Action[] = [
  { label: 'Face drooping on one side', value: 'rf:stroke:face', style: 'danger' },
  { label: 'Arm weakness or numbness', value: 'rf:stroke:arm', style: 'danger' },
  { label: 'Slurred or confused speech', value: 'rf:stroke:speech', style: 'danger' },
  { label: 'Sudden vision loss', value: 'rf:stroke:vision', style: 'danger' },
  { label: 'Sudden severe headache', value: 'rf:stroke:headache', style: 'danger' },
  { label: 'Trouble walking or balance', value: 'rf:stroke:balance', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

export const STROKE: SymptomFlow = {
  id: 'stroke',
  // FAST-style: face drooping, arm weakness, slurred speech, time. We
  // also catch users typing about a relative ("his face is drooping").
  trigger:
    /\b(stroke|face\s+(droop|drooping|paralys|sagging|falling)|arm\s+(weakness|numb|drooping)|slurr(ed|ing)\s+(speech|words)|FAST\s+stroke)\b/i,
  safety: {
    kind: 'safety_check',
    title: 'Possible stroke (FAST)',
    question:
      "Stroke is time-critical. Please check now — any of these symptoms right now?",
    options: STROKE_RED_FLAGS,
    on_positive: 'emergency',
  },
  intake_steps: [],
};

// ─────────────────────────────────────────────────────────────────────
// Infant fever (always urgent under 3 months)
// ─────────────────────────────────────────────────────────────────────

const INFANT_FEVER_RED_FLAGS: Action[] = [
  { label: 'Baby is under 3 months old', value: 'rf:infant:under3mo', style: 'danger' },
  { label: 'Trouble breathing', value: 'rf:infant:breathing', style: 'danger' },
  { label: 'Inconsolable crying or floppy', value: 'rf:infant:floppy', style: 'danger' },
  { label: 'Stiff neck or bulging soft spot', value: 'rf:infant:meningismus', style: 'danger' },
  { label: 'Refusing to feed', value: 'rf:infant:not_feeding', style: 'danger' },
  { label: 'Seizure', value: 'rf:infant:seizure', style: 'danger' },
  { label: 'Rash that does not blanch', value: 'rf:infant:rash', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
];

export const INFANT_FEVER: SymptomFlow = {
  id: 'infant-fever',
  // Trigger on baby/infant + fever. We rely on the parent to set this
  // off explicitly; broad "fever" without "baby" stays in the bubble
  // path (adults with fever follow a different routine).
  trigger:
    /\b(baby|infant|newborn|\d+\s*[-\s]?(?:day|week|month)s?(?:[-\s]?old)?)\b.*\b(fever|temperature|hot|burning\s+up)\b/i,
  safety: {
    kind: 'safety_check',
    title: 'Fever in an infant',
    question:
      "Infant fever can be serious, especially under 3 months. Any of these right now?",
    options: INFANT_FEVER_RED_FLAGS,
    on_positive: 'emergency',
  },
  intake_steps: [],
};

// ─────────────────────────────────────────────────────────────────────
// Mental health
// ─────────────────────────────────────────────────────────────────────

const MH_CRISIS_OPTIONS: Action[] = [
  { label: 'Yes — I am in danger right now', value: 'rf:mh:crisis', style: 'danger' },
  { label: 'I have thoughts of self-harm', value: 'rf:mh:ideation', style: 'danger' },
  { label: 'No, but I am struggling', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

const MH_DURATION_OPTIONS: Action[] = [
  { label: 'Today', value: 'selected:duration:today' },
  { label: 'A few days', value: 'selected:duration:1-3d' },
  { label: 'Several weeks', value: 'selected:duration:4-7d' },
  { label: 'Months or longer', value: 'selected:duration:gt1m' },
];

export const MENTAL_HEALTH: SymptomFlow = {
  id: 'mental-health',
  trigger:
    /\b(anxious|anxiety|panic\s+attack|depress(ed|ion)|suicidal|self.?harm|hopeless|overwhelmed)\b/i,
  safety: {
    kind: 'safety_check',
    title: 'How you are feeling',
    question:
      "I'm sorry you're feeling this way. First — are you safe right now?",
    options: MH_CRISIS_OPTIONS,
    on_positive: 'emergency',
  },
  intake_steps: [
    {
      title: 'How long?',
      question: 'How long have you been feeling this way?',
      input_type: 'chips',
      options: MH_DURATION_OPTIONS,
    },
  ],
};

export const ALL_FLOWS: SymptomFlow[] = [
  // Order matters: more specific patterns first so they win against
  // broader ones. STROKE before HEADACHE because "sudden severe
  // headache" appears in both. INFANT_FEVER before MENTAL_HEALTH so
  // "baby" + "fever" doesn't get hijacked.
  STROKE,
  INFANT_FEVER,
  MENTAL_HEALTH,
  BACK_PAIN,
  HEADACHE,
  STOMACH,
];

/** Find the symptom flow that matches the user's message, if any. */
export function findSymptomFlow(text: string): SymptomFlow | null {
  for (const flow of ALL_FLOWS) {
    if (flow.trigger.test(text)) return flow;
  }
  return null;
}

/** A red-flag selection token (e.g. "rf:back:leg_weakness"). The
 *  special token "rf:none" / "rf:unsure" is NOT a red flag — those
 *  are the safe-default options.
 *
 *  Returns true if the user's selection indicates a red flag is
 *  present, false otherwise. */
export function hasRedFlag(selectionValue: string): boolean {
  return selectionValue.startsWith('rf:') &&
    selectionValue !== 'rf:none' &&
    selectionValue !== 'rf:unsure';
}

/**
 * Server-side card builders.
 *
 * Each builder returns a fully-formed `Card` for a given context. The
 * chat route picks which builder to call based on the intent classifier;
 * the LLM is only invoked when the builder needs reasoning content
 * (currently only the guidance card). This keeps the structured-UI
 * path deterministic and the LLM path scoped to the parts where it
 * actually helps.
 */

import {
  serializeCard,
  type Action,
  type GreetingCard,
  type ProfileGateCard,
  type SafetyCheckCard,
  type IntakeCard,
  type GuidanceCard,
  type LimitedGuidanceCard,
  type EmergencyCard,
  type NextStepsCard,
  type DoctorSummaryCard,
  type CareLevel,
  type Card,
} from './types';

// ─────────────────────────────────────────────────────────────────────
// Greeting — Phase 1
// ─────────────────────────────────────────────────────────────────────

/** Quick-action menu shown when the user opens the chat or sends a
 *  pure greeting. Each action becomes a synthetic user message when
 *  clicked, so the next LLM turn (or builder call) has structured
 *  input rather than free text. */
const GREETING_ACTIONS: Action[] = [
  { label: 'Check symptoms', value: 'intent:check_symptoms', style: 'primary', icon: 'stethoscope' },
  { label: 'Medication question', value: 'intent:medication', icon: 'pill' },
  { label: 'Test results', value: 'intent:test_result', icon: 'file-text' },
  { label: 'Find nearby care', value: 'intent:nearby_care', icon: 'map-pin' },
  { label: 'Emergency', value: 'intent:emergency', style: 'danger', icon: 'alert-triangle' },
];

export function buildGreetingCard(opts: {
  firstName?: string;
  language?: string;
}): GreetingCard {
  // No source chip, no medical-source language. The greeting card is
  // explicitly *not* a clinical reply — it's the navigation hub.
  const name = (opts.firstName || '').trim();
  const text = name
    ? `Hi ${name} 👋 What can I help you with today?`
    : `Hi, I'm MedOS. I can help you check symptoms, understand medications, prepare for a doctor visit, or find care.\n\nWhat would you like help with today?`;
  return { kind: 'greeting', text, actions: GREETING_ACTIONS };
}

// ─────────────────────────────────────────────────────────────────────
// Profile gate — Phase 1
// ─────────────────────────────────────────────────────────────────────

const PROFILE_GATE_ACTIONS: Action[] = [
  { label: 'Complete Health Profile', value: 'open_ehr_wizard', style: 'primary', icon: 'clipboard-list' },
  { label: 'Log in', value: 'open_login', style: 'secondary', icon: 'log-in' },
  { label: 'Continue with general guidance', value: 'continue_general', style: 'ghost' },
  { label: 'Emergency help', value: 'open_emergency', style: 'danger', icon: 'alert-triangle' },
];

/** Gate variant for medication-personal-safety questions. The copy
 *  enumerates the specific contraindications (ulcer / kidney /
 *  blood thinner / pregnancy / NSAID allergy) that justify needing
 *  a Health Profile before personalized medication advice. */
const MEDICATION_GATE_ACTIONS: Action[] = [
  { label: 'Complete Health Profile', value: 'open_ehr_wizard', style: 'primary', icon: 'clipboard-list' },
  { label: 'Log in to use saved profile', value: 'open_login', style: 'secondary', icon: 'log-in' },
  {
    label: 'Continue with general medication information',
    value: 'continue_general',
    style: 'ghost',
  },
  { label: 'Emergency help', value: 'open_emergency', style: 'danger', icon: 'alert-triangle' },
];

/** Standard medical-safety justification. The variant param picks the
 *  copy + action labels:
 *    - 'default'    → generic deep-analysis gate
 *    - 'medication' → medication-personal-safety gate (lists NSAID
 *                     contraindications, swaps the "Continue" label).
 *
 *  Phrased so the user understands the gate as a clinical requirement,
 *  not a marketing ask. Never use words like "premium" / "upgrade" /
 *  "account". */
export function buildProfileGateCard(opts: {
  variant?: 'default' | 'medication';
  drug?: string;
  reason?: string;
  required_fields?: string[];
}): ProfileGateCard {
  const variant = opts.variant || 'default';
  if (variant === 'medication') {
    const drug = opts.drug ? opts.drug : 'this medication';
    return {
      kind: 'profile_gate',
      title: 'Medication guidance requires your Health Profile',
      reason:
        opts.reason ||
        `To answer this safely, MedOS needs to know your medications, allergies, chronic conditions, and relevant medical history. ${drug
          .charAt(0)
          .toUpperCase() + drug.slice(1)} may not be suitable for some people, including those with stomach ulcers, kidney disease, blood thinner use, high blood pressure, heart disease, pregnancy, or NSAID allergy. Emergency guidance is always available without login.`,
      required_fields: opts.required_fields || [
        'Age',
        'Current medications',
        'Allergies',
        'Chronic conditions (kidney / heart / stomach)',
        'Pregnancy status',
      ],
      actions: MEDICATION_GATE_ACTIONS,
    };
  }
  return {
    kind: 'profile_gate',
    title: 'Complete Your Health Profile',
    reason:
      opts.reason ||
      'For deeper symptom analysis, MedOS needs your medical context — age, medications, allergies, chronic conditions, previous injuries, pregnancy status, and medical history — to make the safest, most accurate recommendation. You can still continue with general guidance without a profile. Emergency guidance is always available without login.',
    required_fields: opts.required_fields || [
      'Age',
      'Sex',
      'Current medications',
      'Allergies',
      'Chronic conditions',
      'Relevant medical history',
    ],
    actions: PROFILE_GATE_ACTIONS,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Limited guidance — emitted when the user declines the profile gate
// ─────────────────────────────────────────────────────────────────────

const LIMITED_GUIDANCE_ACTIONS: Action[] = [
  { label: 'Add Health Profile', value: 'open_ehr_wizard', style: 'primary', icon: 'clipboard-list' },
  { label: 'Create general doctor summary', value: 'action:doctor_summary', icon: 'file-text' },
  { label: 'Find nearby care', value: 'intent:nearby_care', icon: 'map-pin' },
  { label: 'Ask another question', value: 'continue_general', style: 'ghost' },
];

export function buildLimitedGuidanceCard(opts: {
  general_advice?: string;
  what_now?: string[];
  variant?: 'symptom' | 'medication';
  drug?: string;
}): LimitedGuidanceCard {
  const variant = opts.variant || 'symptom';
  if (variant === 'medication') {
    const drug = opts.drug || 'this medication';
    return {
      kind: 'limited_guidance',
      general_advice:
        opts.general_advice ||
        `${drug
          .charAt(0)
          .toUpperCase() + drug.slice(1)} is widely used, but it is not safe for everyone. Use caution or ask a clinician first if you have any of the conditions below.`,
      what_now: opts.what_now || [
        'Avoid use if you have kidney disease, stomach ulcers, blood thinner use, heart disease, uncontrolled high blood pressure, pregnancy, or NSAID allergy',
        'A pharmacist can confirm what is safe for you in a few minutes',
        'Use the lowest dose for the shortest time when starting any new pain reliever',
      ],
      missing_for_personalization: [
        'Your current medications (for interaction checks)',
        'Your allergies (especially NSAID and aspirin)',
        'Your chronic conditions (kidney / heart / stomach)',
        'Your pregnancy status, if relevant',
      ],
      actions: LIMITED_GUIDANCE_ACTIONS,
    };
  }
  return {
    kind: 'limited_guidance',
    general_advice:
      opts.general_advice ||
      'I can continue with general guidance. Without your Health Profile, I cannot personalize this based on medications, allergies, chronic conditions, age, or previous injuries.',
    what_now: opts.what_now || [
      'Follow the general guidance from the previous answer',
      'Monitor your symptoms over the next few days',
      'Seek medical care if symptoms worsen or new warning signs appear',
    ],
    missing_for_personalization: [
      'Your age and sex (changes likely causes)',
      'Your medications (interaction warnings)',
      'Your allergies (drug safety)',
      'Your chronic conditions (risk weighting)',
      'Previous injuries to this area',
    ],
    actions: LIMITED_GUIDANCE_ACTIONS,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Emergency card — emitted when preCheck() fires a red-flag rule
// ─────────────────────────────────────────────────────────────────────

export function buildEmergencyCard(opts: {
  reason: string;
  emergency_number: string;
}): EmergencyCard {
  return {
    kind: 'emergency',
    headline: 'This may be an emergency.',
    reason: opts.reason,
    emergency_number: opts.emergency_number,
    actions: [
      {
        label: `Call ${opts.emergency_number}`,
        value: `tel:${opts.emergency_number}`,
        style: 'danger',
        icon: 'phone',
      },
      {
        label: 'Find nearby emergency care',
        value: 'intent:nearby_emergency',
        icon: 'map-pin',
      },
      {
        label: 'Prepare emergency summary',
        value: 'action:doctor_summary',
        icon: 'file-text',
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Safety check — Phase 2 placeholder (full builder ships in Batch 2)
// ─────────────────────────────────────────────────────────────────────

const BACK_PAIN_RED_FLAGS: Action[] = [
  { label: 'Leg weakness or numbness', value: 'rf:leg_weakness', style: 'danger' },
  { label: 'Loss of bladder or bowel control', value: 'rf:incontinence', style: 'danger' },
  { label: 'Fever', value: 'rf:fever', style: 'danger' },
  { label: 'Recent fall or injury', value: 'rf:trauma', style: 'danger' },
  { label: 'Chest pain or trouble breathing', value: 'rf:cardiopulmonary', style: 'danger' },
  { label: 'Severe sudden pain', value: 'rf:severe_sudden', style: 'danger' },
  { label: 'None of these', value: 'rf:none', style: 'primary' },
  { label: 'Not sure', value: 'rf:unsure' },
];

export function buildBackPainSafetyCard(): SafetyCheckCard {
  return {
    kind: 'safety_check',
    title: 'Back pain',
    question:
      "I can help with back pain. First, let's check for warning signs. Do you have any of these right now?",
    options: BACK_PAIN_RED_FLAGS,
    on_positive: 'urgent_care',
  };
}

// ─────────────────────────────────────────────────────────────────────
// Intake / guidance / next-steps / doctor summary — Batch 2+
// ─────────────────────────────────────────────────────────────────────

export function buildIntakeCard(opts: {
  title: string;
  question: string;
  options?: Action[];
  slider?: IntakeCard['slider'];
  progress: number;
}): IntakeCard {
  const input_type = opts.slider ? 'slider' : opts.options ? 'chips' : 'text';
  return {
    kind: 'intake',
    title: opts.title,
    question: opts.question,
    input_type,
    options: opts.options,
    slider: opts.slider,
    progress: opts.progress,
  };
}

export function buildGuidanceCard(opts: {
  title: string;
  care_level: CareLevel;
  why: string;
  what_now: string[];
  seek_care_if: string[];
  sources?: string[];
}): GuidanceCard {
  return {
    kind: 'guidance',
    ...opts,
    sources: opts.sources || ['WHO', 'CDC', 'NHS'],
  };
}

export function buildNextStepsCard(opts: {
  title: string;
  summary?: string;
  actions: Action[];
}): NextStepsCard {
  return { kind: 'next_steps', ...opts };
}

export function buildDoctorSummaryCard(opts: {
  chief_complaint: string;
  duration: string;
  severity?: number;
  red_flags_checked: string[];
  warning_signs_present: string[];
  current_guidance: string;
  seek_care_if: string[];
}): DoctorSummaryCard {
  return {
    kind: 'doctor_summary',
    ...opts,
    generated_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Stream helpers
// ─────────────────────────────────────────────────────────────────────

/** Emit a single card as a server-sent chunk in the existing chat
 *  response shape (`choices[0].delta.content`). The bubble/card
 *  splitter on the client picks it up. */
export function streamCardChunk(card: Card): string {
  const data = JSON.stringify({
    choices: [{ delta: { content: serializeCard(card) } }],
    provider: 'medical-flow',
    model: `card:${card.kind}`,
  });
  return `data: ${data}\n\n`;
}

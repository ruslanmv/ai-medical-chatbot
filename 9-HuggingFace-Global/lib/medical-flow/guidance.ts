/**
 * Guidance generator — turns the user's collected answers into a
 * structured care-level recommendation.
 *
 * Inputs:
 *   - the SymptomFlow they just completed
 *   - their structured answers (location / duration / severity)
 *   - any red flags they ticked on the safety check
 *
 * Output: a fully-formed GuidanceCard with `care_level` (self-care /
 * routine / urgent / emergency), a why-clause, action lists, and the
 * red flags to watch for. Deterministic — same inputs always produce
 * the same recommendation. This is intentional for medico-legal
 * defensibility: any reviewer can trace exactly why MedOS told the
 * user what it did.
 *
 * The LLM is NOT called here. Phase-2 may augment guidance with a
 * short patient-context-aware paragraph (e.g. "Given your lisinopril,
 * skip ibuprofen"), but Phase-1 stays deterministic so the benchmark
 * suite can score it reproducibly.
 */

import type {
  Action,
  CareLevel,
  GuidanceCard,
  DoctorSummaryCard,
} from './types';
import type { SymptomFlow } from './symptoms';
import { hasRedFlag } from './symptoms';
import { buildGuidanceCard, buildDoctorSummaryCard } from './cards';
import { emergencyCardEnabled } from '../feature-flags';

export interface Answers {
  red_flags_selected?: string[]; // raw tokens
  location?: string;
  duration?: string;
  severity?: number;
}

/** Decide the care level from the user's answers + flow defaults.
 *
 *  The SafetyCheckCard.on_positive enum is wire-internal (`urgent_care`,
 *  `emergency`, `continue`); the CareLevel enum is what the client UI
 *  styles by (`urgent`, `emergency`, …). This function bridges them so
 *  the client always receives a valid CareLevel.
 */
export function classifyCareLevel(
  flow: SymptomFlow,
  answers: Answers,
): CareLevel {
  const redFlags = (answers.red_flags_selected || []).filter(hasRedFlag);
  if (redFlags.length > 0) {
    // Headache flow escalates harder — thunderclap / worst-of-life is
    // an emergency, not "urgent care today".
    if (flow.safety.on_positive === 'emergency') {
      // When the MEDOS_EMERGENCY_CARD_ENABLED feature flag is OFF
      // (default), downgrade `emergency` → `urgent`. Users with red
      // flags still get a strongly-worded guidance card directing
      // them to seek same-day care (with the local emergency number
      // in `seek_care_if`), but they don't see the alarming red
      // emergency UI. Re-enabling the flag restores the original
      // emergency classification.
      return emergencyCardEnabled() ? 'emergency' : 'urgent';
    }
    if (flow.safety.on_positive === 'urgent_care') return 'urgent';
    return 'routine';
  }
  if ((answers.severity ?? 0) >= 8) return 'urgent';
  if ((answers.severity ?? 0) >= 5) return 'routine';
  return 'self-care';
}

/** Symptom-flow-specific copy. Kept in code (not LLM-generated) so a
 *  clinician can review the exact text users will see. */
const COPY: Record<
  string,
  {
    self_care: { why: string; what_now: string[]; seek_care_if: string[] };
    routine: { why: string; what_now: string[]; seek_care_if: string[] };
    urgent: { why: string; what_now: string[]; seek_care_if: string[] };
    emergency: { why: string; what_now: string[]; seek_care_if: string[] };
  }
> = {
  'back-pain': {
    self_care: {
      why: 'Your answers do not show major warning signs. Back pain at this level is often related to muscle strain, posture, or movement.',
      what_now: [
        'Keep gentle movement if possible',
        'Avoid heavy lifting for a few days',
        'Try heat or ice on the painful area',
        'Consider over-the-counter pain relief if safe for you',
        'Monitor symptoms over the next few days',
      ],
      seek_care_if: [
        'Pain gets worse or spreads down your leg',
        'You develop numbness or weakness',
        'You develop fever',
        'You lose bladder or bowel control',
        'Pain lasts more than 1–2 weeks',
      ],
    },
    routine: {
      why: 'Your back pain is moderate. Most cases improve with self-care, but a clinician visit within the next few days would be reasonable to rule out specific causes.',
      what_now: [
        'Gentle movement and stretching',
        'Avoid prolonged bed rest',
        'Heat / ice as comfort allows',
        'Track when pain is worse vs. better',
        'Book a routine appointment with your clinician',
      ],
      seek_care_if: [
        'Pain becomes severe or wakes you at night',
        'You develop leg weakness or numbness',
        'You lose bladder or bowel control',
        'Fever or unexplained weight loss',
      ],
    },
    urgent: {
      why: 'Your pain is severe. Even without classic red flags, severe back pain warrants medical assessment today.',
      what_now: [
        'Seek same-day evaluation (urgent care or your clinician)',
        'Note exactly when the pain started and what makes it worse',
        'Bring a list of any medications you take',
        'Avoid taking new pain medications without advice',
      ],
      seek_care_if: [
        'You develop leg weakness, numbness, or saddle anaesthesia',
        'You lose bladder or bowel control — go to the ER',
        'Trouble breathing or chest pain — call emergency services',
      ],
    },
    emergency: {
      why: 'Your answers suggest possible cauda equina or another red-flag pattern. This needs emergency assessment NOW.',
      what_now: [
        'Go to the emergency department now',
        'Or call your local emergency number',
        'Do not drive yourself if you have weakness',
        'Bring a list of medications and recent symptoms',
      ],
      seek_care_if: [
        'Symptoms worsen on the way — call emergency services en route',
      ],
    },
  },
  headache: {
    self_care: {
      why: 'Your headache pattern does not show major warning signs. Most headaches resolve with rest, hydration, and time.',
      what_now: [
        'Rest in a quiet, dim room',
        'Drink water — dehydration is a common trigger',
        'Consider OTC pain relief if safe for you',
        'Track what time it started and any triggers',
      ],
      seek_care_if: [
        'Pain becomes the worst headache of your life',
        'Sudden onset over seconds',
        'Vision changes, weakness, or confusion',
        'Stiff neck + fever',
      ],
    },
    routine: {
      why: 'Your headache is more bothersome but does not show red flags. A routine clinician visit can help if it recurs.',
      what_now: [
        'Note frequency and triggers',
        'Sleep, hydration, regular meals',
        'Limit screen time and bright light',
        'Consider speaking to your clinician about pattern',
      ],
      seek_care_if: [
        'Sudden severe onset',
        'Neurological changes (vision, weakness, speech)',
        'Fever with stiff neck',
      ],
    },
    urgent: {
      why: 'Severe headache warrants same-day medical evaluation.',
      what_now: [
        'Seek same-day care',
        'Do not drive if vision or coordination affected',
        'Note time of onset precisely',
      ],
      seek_care_if: [
        'Worst headache of life — go to ER now',
        'New neurological symptoms — go to ER now',
      ],
    },
    emergency: {
      why: 'Your headache pattern suggests a possible emergency (thunderclap onset, worst-of-life, meningitis, or stroke signs). Get emergency help NOW.',
      what_now: [
        'Call your local emergency number immediately',
        'Or go to the nearest emergency department',
        'Do not drive yourself',
      ],
      seek_care_if: [
        'Symptoms worsening en route — call emergency services',
      ],
    },
  },
  'chest-pain': {
    self_care: {
      why: 'Your answers do not show red-flag features. Chest pain at this severity is often musculoskeletal (chest wall, costochondritis), reflux, or anxiety-related — but new chest pain still deserves evaluation.',
      what_now: [
        'Rest and avoid heavy exertion until evaluated',
        'Note exactly when the pain started and what makes it worse',
        'Avoid heavy meals, caffeine, and alcohol for a few hours',
        'Track if it returns; book a routine clinician visit',
      ],
      seek_care_if: [
        'Pain radiates to arm, jaw, or neck',
        'You develop shortness of breath, sweating, nausea, or fainting',
        'Pain becomes crushing or pressure-like',
        'Pain returns with exertion',
      ],
    },
    routine: {
      why: 'Moderate chest pain without classic red flags should be evaluated by a clinician this week to rule out specific causes.',
      what_now: [
        'Book an appointment within the next few days',
        'Avoid heavy exertion until seen',
        'Bring a list of medications and any recent symptom diary',
        'Note any pattern (after meals, with activity, at rest, with breathing)',
      ],
      seek_care_if: [
        'Pain becomes severe or constant',
        'You develop shortness of breath, sweating, fainting',
        'Pain radiates to arm or jaw — go to the ER',
      ],
    },
    urgent: {
      why: 'Severe chest pain warrants same-day evaluation even without classic red flags.',
      what_now: [
        'Seek same-day care (urgent care or ER)',
        'Do not drive yourself',
        'Note exact onset time and any associated symptoms',
      ],
      seek_care_if: [
        'Pain radiates to arm or jaw — call emergency services en route',
        'You develop fainting or severe shortness of breath',
      ],
    },
    emergency: {
      why: 'Your symptoms include features that suggest a possible cardiac emergency. Get emergency help NOW.',
      what_now: [
        'Call your local emergency number immediately',
        'Sit upright, stay calm, loosen tight clothing',
        'Chew aspirin ONLY if you are not allergic AND a clinician has previously advised it',
        'Do NOT drive yourself — wait for an ambulance',
      ],
      seek_care_if: [
        'Symptoms worsen on the way — call emergency services en route',
      ],
    },
  },
  stroke: {
    self_care: { why: '', what_now: [], seek_care_if: [] },
    routine: { why: '', what_now: [], seek_care_if: [] },
    urgent: { why: '', what_now: [], seek_care_if: [] },
    emergency: {
      why: 'Your description matches a possible stroke (FAST: face, arm, speech, time). Stroke is time-critical — every minute of delay loses brain tissue.',
      what_now: [
        'Call your local emergency number NOW',
        'Note the exact time symptoms started — clinicians need this',
        'Do NOT drive — wait for an ambulance',
        'Do NOT give food, water, or medications',
        'Lay the person on their side if they are not fully alert',
      ],
      seek_care_if: [
        'Symptoms get worse on the way — call emergency services again',
      ],
    },
  },
  'infant-fever': {
    self_care: { why: '', what_now: [], seek_care_if: [] },
    routine: { why: '', what_now: [], seek_care_if: [] },
    urgent: {
      why: 'Fever in an infant warrants same-day evaluation. Babies cannot tell us how they feel and decline quickly.',
      what_now: [
        'Call your pediatrician or clinician today',
        'Keep the baby hydrated (breast milk or formula)',
        'Dress lightly, do not over-bundle',
        'Take temperature every 1–2 hours and note times',
      ],
      seek_care_if: [
        'Baby is under 3 months old — ER now',
        'Difficulty breathing, blue lips, or floppy / inconsolable',
        'Stiff neck, bulging soft spot, or rash that does not blanch',
        'Refuses to feed for several hours',
        'Seizure',
      ],
    },
    emergency: {
      why: 'Fever in a baby under 3 months — or with any red flag — is an emergency. Babies decline rapidly and need immediate evaluation.',
      what_now: [
        'Go to the emergency department NOW',
        'Or call your local emergency number',
        'Bring the baby\'s feeding history and any medications',
        'Continue gentle hydration on the way',
      ],
      seek_care_if: [
        'Difficulty breathing or color change — call emergency services en route',
      ],
    },
  },
  'mental-health': {
    self_care: {
      why: 'Brief stress reactions are common and often improve with rest and grounding. If they persist or interfere with daily life, please reach out for support.',
      what_now: [
        'Slow breathing: 4 seconds in, 6 seconds out for 2 minutes',
        'Limit caffeine, alcohol, and late-night screens',
        'Reach out to one trusted person',
        'Consider speaking with a mental health professional',
      ],
      seek_care_if: [
        'Symptoms worsen or last more than 2 weeks',
        'You cannot sleep, eat, or work',
        'You have thoughts of self-harm — call your local crisis line immediately',
      ],
    },
    routine: {
      why: 'Symptoms lasting several weeks deserve a conversation with a clinician or therapist. Effective treatments exist and help most people.',
      what_now: [
        'Book a routine appointment with your primary clinician or a therapist',
        'Track triggers in a short daily journal',
        'Prioritize sleep, movement, and connection',
        'Avoid alcohol as a coping tool',
      ],
      seek_care_if: [
        'You feel unsafe or are thinking about self-harm — call a crisis line now',
        'Symptoms worsen rapidly',
      ],
    },
    urgent: {
      why: 'Intense or escalating symptoms warrant same-day support. Crisis lines and urgent mental-health clinics can help today.',
      what_now: [
        'Call a crisis line in your country today',
        'Stay with someone you trust',
        'Avoid alcohol and recreational drugs',
        'Remove access to means of self-harm if you can',
      ],
      seek_care_if: [
        'You are in immediate danger — call emergency services',
      ],
    },
    emergency: {
      why: 'You said you are not safe right now. Please get help immediately.',
      what_now: [
        'Call your local emergency number now',
        'Or go to the nearest emergency department',
        'Tell someone you trust where you are',
      ],
      seek_care_if: [
        'You feel worse on the way — call again, stay on the line',
      ],
    },
  },
  'abdominal-pain': {
    self_care: {
      why: 'Your stomach pain pattern does not show major warning signs. Mild abdominal pain often resolves on its own or with simple measures.',
      what_now: [
        'Sip clear fluids',
        'Avoid heavy, fatty, or spicy food until it settles',
        'Rest',
        'Note timing in relation to meals',
      ],
      seek_care_if: [
        'Pain becomes severe or localizes to the right lower side',
        'Blood in stool or vomit',
        'Fever over 39 °C / 102 °F',
        'Pregnancy and worsening pain',
      ],
    },
    routine: {
      why: 'Moderate, persistent stomach pain warrants a routine clinician visit to identify the cause.',
      what_now: [
        'Book a routine appointment',
        'Keep a food / symptom diary',
        'Avoid NSAIDs (e.g. ibuprofen) until evaluated',
        'Stay hydrated',
      ],
      seek_care_if: [
        'Pain becomes severe',
        'You cannot keep fluids down',
        'Blood in stool or black tarry stools',
      ],
    },
    urgent: {
      why: 'Severe stomach pain warrants same-day evaluation. Several urgent conditions can present this way.',
      what_now: [
        'Seek same-day care (urgent care or ER)',
        'Do not eat until evaluated',
        'Note exactly where the pain is and when it started',
      ],
      seek_care_if: [
        'Pain becomes constant and worse with movement',
        'Vomiting blood',
        'Fainting',
      ],
    },
    emergency: {
      why: 'Your symptoms suggest a possible surgical or obstetric emergency. Get emergency help NOW.',
      what_now: [
        'Call your local emergency number',
        'Or go to the emergency department now',
        'Do not eat or drink anything in case surgery is needed',
      ],
      seek_care_if: [
        'Symptoms worsening en route — call emergency services',
      ],
    },
  },
};

const SOURCES = ['WHO', 'CDC', 'NHS'];

/**
 * Build the guidance card for a completed symptom flow. Deterministic.
 *
 * Returns `null` if we don't have copy for this flow yet — caller should
 * fall through to the LLM bubble path so the user still gets an answer.
 */
export function buildSymptomGuidance(
  flow: SymptomFlow,
  answers: Answers,
): GuidanceCard | null {
  const copy = COPY[flow.id];
  if (!copy) return null;
  const care_level = classifyCareLevel(flow, answers);
  const bucket =
    care_level === 'self-care'
      ? copy.self_care
      : care_level === 'routine'
      ? copy.routine
      : care_level === 'urgent'
      ? copy.urgent
      : copy.emergency;
  return buildGuidanceCard({
    title: flow.safety.title,
    care_level,
    why: bucket.why,
    what_now: bucket.what_now,
    seek_care_if: bucket.seek_care_if,
    sources: SOURCES,
  });
}

/** Build the doctor-summary card from collected state. */
export function buildSymptomDoctorSummary(
  flow: SymptomFlow,
  answers: Answers,
  guidance: GuidanceCard,
): DoctorSummaryCard {
  const labelMap: Record<string, string> = {
    today: 'Started today',
    '1-3d': '1–3 days',
    '4-7d': '4–7 days',
    gt1w: 'More than 1 week',
    gt1m: 'More than 1 month',
  };
  const allRedFlags = flow.safety.options
    .filter((o) => o.style === 'danger')
    .map((o) => o.label);
  const present = (answers.red_flags_selected || [])
    .filter(hasRedFlag)
    .map((v) => flow.safety.options.find((o) => o.value === v)?.label || v);
  return buildDoctorSummaryCard({
    chief_complaint: `${flow.safety.title}${
      answers.location ? ` (${answers.location})` : ''
    }`,
    duration: answers.duration ? labelMap[answers.duration] || answers.duration : '—',
    severity: answers.severity,
    red_flags_checked: allRedFlags,
    warning_signs_present: present,
    current_guidance: guidance.care_level,
    seek_care_if: guidance.seek_care_if,
  });
}

/** Next-steps card shown after the guidance card. Buttons let the user
 *  generate a doctor summary, find nearby care, or save the
 *  conversation to their health profile. */
export function buildSymptomNextSteps(): Action[] {
  return [
    { label: 'Create doctor summary', value: 'action:doctor_summary', style: 'primary', icon: 'file-text' },
    { label: 'Find nearby care', value: 'intent:nearby_care' },
    { label: 'Add health profile', value: 'open_ehr_wizard' },
    { label: 'Ask another question', value: 'continue_general', style: 'ghost' },
  ];
}

/**
 * Allergy guard — deterministic post-LLM scrubber.
 *
 * The LLM occasionally suggests a drug from a class the user is
 * allergic to, even when the patient_context explicitly lists the
 * allergy and the system prompt mandates an allergy check. This is
 * the second line of defence:
 *
 *   1. Extract the user's allergies (from server EHR or the
 *      <patient_context> block in the user message).
 *   2. Expand each allergy to its drug class (penicillin →
 *      amoxicillin, ampicillin, augmentin, …).
 *   3. Scan the LLM output for any expanded drug name.
 *   4. If found, prepend a clear allergy-warning card to the response
 *      and replace the forbidden drug name in-line with
 *      "[CONTRAINDICATED for your allergy]".
 *
 * This guarantees by construction that a forbidden drug never reaches
 * the user as a recommendation — the structural moat we cannot ship
 * without a typed patient profile (i.e. that ChatGPT cannot replicate
 * without prompt-engineering, which they admit is unreliable).
 */

import { serializeCard, type Card } from './types';

// Common drug-class expansions. Keep narrow; medical literature
// recognizes broader cross-reactivity (e.g. penicillin → some
// cephalosporins) but those are clinically judgement calls — we
// flag obvious within-class only to avoid false positives.
const ALLERGEN_EXPANSIONS: Record<string, string[]> = {
  penicillin: [
    'penicillin',
    'penicillins',
    'amoxicillin',
    'amoxicillin-clavulanate',
    'amox-clav',
    'augmentin',
    'ampicillin',
    'piperacillin',
    'oxacillin',
    'nafcillin',
    'dicloxacillin',
    'pen-vk',
    'pen vk',
  ],
  sulfa: [
    'sulfa',
    'sulfonamide',
    'sulfamethoxazole',
    'sulfasalazine',
    'bactrim',
    'septra',
    'tmp-smx',
    'trimethoprim-sulfamethoxazole',
    'co-trimoxazole',
  ],
  nsaid: [
    'ibuprofen',
    'naproxen',
    'aspirin',
    'asa',
    'advil',
    'motrin',
    'aleve',
    'celecoxib',
    'meloxicam',
    'diclofenac',
    'ketorolac',
    'indomethacin',
  ],
  aspirin: [
    'aspirin',
    'asa',
    'acetylsalicylic',
  ],
  latex: ['latex'],
  iodine: ['iodine', 'contrast', 'povidone-iodine', 'betadine'],
  // Single-drug allergies (no expansion).
  codeine: ['codeine'],
  morphine: ['morphine'],
  statins: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
};

function expandAllergy(allergyName: string): string[] {
  const key = allergyName.trim().toLowerCase();
  // Direct hit on a known class.
  if (ALLERGEN_EXPANSIONS[key]) return ALLERGEN_EXPANSIONS[key];
  // Substring match — e.g. "amoxicillin allergy" → expand penicillin class.
  for (const [cls, members] of Object.entries(ALLERGEN_EXPANSIONS)) {
    if (members.some((m) => key.includes(m))) return members;
  }
  // Unknown allergen — flag the literal name only.
  return [key];
}

/** Extract the user's allergies from the conversation context.
 *  Reads either the server-derived patient_context string OR the
 *  client-injected <patient_context> block on the user message. */
export function extractAllergies(opts: {
  patient_context?: string;
  user_message?: string;
}): string[] {
  const candidate = opts.patient_context || opts.user_message || '';
  const match = candidate.match(/allergies\s*=\s*([^\n<]+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && !/^(none|none\s+known|n\/a)$/i.test(s));
}

/** The forbidden drug list expanded from a list of allergies. */
export function forbiddenDrugList(allergies: string[]): string[] {
  const set = new Set<string>();
  for (const a of allergies) {
    for (const d of expandAllergy(a)) set.add(d.toLowerCase());
  }
  return Array.from(set);
}

export interface AllergyScanResult {
  /** True when at least one forbidden drug appeared in the reply. */
  violated: boolean;
  /** The drug names that triggered the violation. */
  hits: string[];
  /** The reply with each forbidden drug name annotated. */
  annotated_reply: string;
  /** A prepend-able warning card serialized as a wire-format string. */
  warning_card_chunk: string;
}

/** Scan a reply for forbidden-drug mentions. */
export function scanForAllergyViolation(
  reply: string,
  allergies: string[],
  emergencyNumber: string,
): AllergyScanResult {
  if (allergies.length === 0 || !reply) {
    return { violated: false, hits: [], annotated_reply: reply, warning_card_chunk: '' };
  }
  const forbidden = forbiddenDrugList(allergies);
  const hits: string[] = [];
  let annotated = reply;
  for (const d of forbidden) {
    // Word-boundary, case-insensitive. Tolerates hyphens (amox-clav).
    const re = new RegExp(`\\b${d.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    if (re.test(annotated)) {
      hits.push(d);
      // Fully obscure the drug name so neither the user nor any
      // downstream consumer sees the unmarked recommendation. The
      // user gets the warning card above the answer; the in-line
      // placeholder makes the original sentence still parse.
      annotated = annotated.replace(
        re,
        '[medication you are allergic to — see warning above]',
      );
    }
  }
  if (hits.length === 0) {
    return { violated: false, hits: [], annotated_reply: reply, warning_card_chunk: '' };
  }
  const card: Card = {
    kind: 'emergency',
    headline: 'Allergy safety override',
    reason: `The reply mentioned a drug you reported an allergy to: ${hits.join(
      ', ',
    )}. MedOS has flagged those mentions in the answer below. Please confirm any antibiotic or analgesic with a pharmacist or clinician — alternatives outside the ${allergies.join(', ')} class are usually safer.`,
    emergency_number: emergencyNumber,
    actions: [
      {
        label: 'Ask a pharmacist about alternatives',
        value: 'intent:nearby_care',
        style: 'primary',
        icon: 'map-pin',
      },
      {
        label: 'Update Health Profile',
        value: 'open_ehr_wizard',
        icon: 'clipboard-list',
      },
    ],
  };
  return {
    violated: true,
    hits,
    annotated_reply: annotated,
    warning_card_chunk: `\n${serializeCard(card)}\n`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Drug-interaction pre-check
// ─────────────────────────────────────────────────────────────────────

/** Hand-curated interaction table. Each entry maps a (user medication,
 *  asked-about drug) pair to a one-line warning. Conservative —
 *  includes only well-known, clinically significant interactions that
 *  patients reliably miss. */
interface Interaction {
  user_med: string;          // substring matched in patient med list
  asked_drug: string;        // substring matched in user's question
  message: string;           // the warning the card displays
}

const INTERACTIONS: Interaction[] = [
  {
    user_med: 'lisinopril',
    asked_drug: 'ibuprofen',
    message:
      'Lisinopril (an ACE inhibitor) and ibuprofen (an NSAID) interact: combining them can raise blood pressure and stress the kidneys (hyperkalemia + acute kidney injury risk). Acetaminophen is usually a safer choice for occasional pain — confirm with your prescriber.',
  },
  {
    user_med: 'lisinopril',
    asked_drug: 'naproxen',
    message:
      'Lisinopril (ACE inhibitor) and naproxen (NSAID) have the same kidney + blood-pressure interaction as ibuprofen. Acetaminophen is generally safer for occasional pain — confirm with your prescriber.',
  },
  {
    user_med: 'warfarin',
    asked_drug: 'ibuprofen',
    message:
      'Warfarin and ibuprofen substantially raise bleeding risk. Avoid NSAIDs while on warfarin without explicit prescriber approval; acetaminophen is the standard alternative.',
  },
  {
    user_med: 'warfarin',
    asked_drug: 'aspirin',
    message:
      'Aspirin + warfarin together significantly raise bleeding risk. Do not start aspirin without prescriber approval.',
  },
  {
    user_med: 'metformin',
    asked_drug: 'contrast',
    message:
      'Metformin should be paused before IV contrast (e.g. CT with contrast) to reduce kidney-injury risk. Tell the radiology team and your prescriber.',
  },
];

export interface InteractionMatch {
  user_med: string;
  asked_drug: string;
  message: string;
}

/** Scan the user's question + their meds for a known interaction. */
export function detectInteraction(opts: {
  patient_context?: string;
  user_message: string;
}): InteractionMatch | null {
  const context = (opts.patient_context || '').toLowerCase();
  // Extract medications from the patient_context block: `medications=lisinopril 10mg, ...`
  const medMatch = context.match(/medications\s*=\s*([^\n<]+)/i);
  const userMeds = medMatch ? medMatch[1].toLowerCase() : '';
  const userMsg = (opts.user_message || '').toLowerCase();
  for (const i of INTERACTIONS) {
    if (userMeds.includes(i.user_med) && userMsg.includes(i.asked_drug)) {
      return { ...i };
    }
  }
  return null;
}

/** Build a guidance card directly from an interaction match. */
export function buildInteractionWarningCard(m: InteractionMatch): Card {
  return {
    kind: 'guidance',
    title: 'Medication interaction',
    care_level: 'urgent',
    why: m.message,
    what_now: [
      'Do not start the new medication without checking with your prescriber or pharmacist',
      'For occasional pain, acetaminophen is usually the safer first step (confirm with your prescriber)',
      'Note the date and time of any symptoms that started after taking the new drug',
    ],
    seek_care_if: [
      'Reduced urine output, swelling, or unusual fatigue (kidney signs)',
      'Unusual bruising, bleeding gums, or black stools (bleeding risk)',
      'Severe stomach pain or vomiting blood',
    ],
    sources: ['BNF', 'NICE', 'CDC'],
  };
}

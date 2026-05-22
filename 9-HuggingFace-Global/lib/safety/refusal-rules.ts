/**
 * Refusal taxonomy.
 *
 * Categories of user request that the model must not satisfy. Used by the
 * output filter to detect when a model has drifted into one of these
 * categories, and to produce a safe rewrite.
 *
 * Categories are stable identifiers; copy lives in disclaimers / locale
 * packs (Phase 2A).
 */

export type RefusalCategory =
  | 'diagnosis_definitive'
  | 'prescription_or_dose'
  | 'off_label'
  | 'no_doctor_needed'
  | 'self_harm_method_request'
  | 'minor_unconsented'
  | 'illegal_action_in_health_context';

export interface RefusalSpec {
  code: RefusalCategory;
  label: string;
  description: string;
  /** Default replacement for the user-facing answer. */
  saferRewrite: string;
}

export const REFUSALS: Record<RefusalCategory, RefusalSpec> = {
  diagnosis_definitive: {
    code: 'diagnosis_definitive',
    label: 'Definitive diagnosis',
    description:
      'A statement that asserts the user has condition X. MedOS describes possibilities, ' +
      'not diagnoses.',
    saferRewrite:
      "I can't tell you what condition you have — that requires a clinician. " +
      'I can describe what your symptoms could fit and help you decide what kind of care to seek.',
  },
  prescription_or_dose: {
    code: 'prescription_or_dose',
    label: 'Prescription or dose recommendation',
    description:
      'Telling the user to start, stop, or change a medication, or to take a specific dose. ' +
      'Forbidden in all cases. Discussing what a medicine is or general indications is fine.',
    saferRewrite:
      "I can't recommend a medication or a specific dose. Please ask a pharmacist or your " +
      'clinician — they can review your full history and any other medicines you take.',
  },
  off_label: {
    code: 'off_label',
    label: 'Off-label use suggestion',
    description:
      'Suggesting using an approved medicine for an indication it is not approved for. Forbidden.',
    saferRewrite:
      "I can't suggest off-label use of any medicine. A clinician can discuss whether " +
      'an approved option is appropriate for your situation.',
  },
  no_doctor_needed: {
    code: 'no_doctor_needed',
    label: '"You don\'t need a doctor" reassurance',
    description:
      'Phrases that imply a clinician visit is unnecessary in the face of symptoms. The model ' +
      'is allowed to say care is not urgent; it is not allowed to say no clinician is needed.',
    saferRewrite:
      'For symptoms that are persistent, worsening, or unfamiliar to you, it is reasonable ' +
      'to check in with a clinician — even if the situation is not urgent.',
  },
  self_harm_method_request: {
    code: 'self_harm_method_request',
    label: 'Self-harm method request',
    description:
      'Any request for methods, doses, or means of self-harm. Always refused. Always offers ' +
      'a crisis line.',
    saferRewrite:
      "I'm not going to help with that. If you are thinking of hurting yourself, please " +
      "reach out — your local emergency number, a crisis line, or someone you trust. You don't have to figure this out alone.",
  },
  minor_unconsented: {
    code: 'minor_unconsented',
    label: 'Medical advice for a minor without guardian framing',
    description:
      'Advice tailored to a specific minor when the requester is not in a guardian role. ' +
      'MedOS describes information generally and routes to a guardian-managed surface.',
    saferRewrite:
      "For decisions about a child's health, a parent, legal guardian, or pediatrician should " +
      'be involved. I can share general information; for specific guidance please contact a clinician.',
  },
  illegal_action_in_health_context: {
    code: 'illegal_action_in_health_context',
    label: 'Illegal action in a health context',
    description:
      'Acquiring controlled substances without a prescription, performing a procedure ' +
      'on someone else, etc. Always refused.',
    saferRewrite:
      "I can't help with that. If there is a clinical question behind it, I'm happy to discuss " +
      'the underlying topic in general terms.',
  },
};

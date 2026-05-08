/**
 * R0–R5 risk classes for MedOS.
 *
 * Definitions, defaults, and hard rules for what the LLM is allowed to do
 * at each level. The deterministic safety engine uses this taxonomy; the
 * LLM is allowed to *describe* a risk class but never to *downgrade* it.
 *
 * See SAFETY.md and GOVERNANCE.md at the repo root.
 */

export type RiskClass = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface RiskClassSpec {
  code: RiskClass;
  label: string;
  description: string;
  /**
   * Whether the LLM may answer at all. R5 always uses a deterministic
   * template; the LLM may add a brief empathic preamble that the output
   * filter then re-validates.
   */
  llmAllowed: boolean;
  /**
   * Whether the response must include the local emergency number.
   */
  emergencyNumberRequired: boolean;
  /**
   * Whether the response must explicitly route the user to a clinician.
   */
  clinicianReferralRequired: boolean;
  /**
   * Whether self-care / over-the-counter wording is allowed.
   * Forbidden at R2 and above.
   */
  selfCareAllowed: boolean;
}

export const RISK_CLASSES: Record<RiskClass, RiskClassSpec> = {
  R0: {
    code: 'R0',
    label: 'General wellness / low risk',
    description:
      'General health information, lifestyle questions, definitions, education. ' +
      'No symptoms requiring action.',
    llmAllowed: true,
    emergencyNumberRequired: false,
    clinicianReferralRequired: false,
    selfCareAllowed: true,
  },
  R1: {
    code: 'R1',
    label: 'Mild symptoms, self-care guidance allowed',
    description:
      'Mild, time-limited symptoms with no red flags. Common cold, mild headache, ' +
      'minor abrasion. Self-care wording is allowed; user is reminded that ' +
      'persistent or worsening symptoms warrant clinician contact.',
    llmAllowed: true,
    emergencyNumberRequired: false,
    clinicianReferralRequired: false,
    selfCareAllowed: true,
  },
  R2: {
    code: 'R2',
    label: 'Needs non-urgent professional care',
    description:
      'Symptoms or situations that warrant a non-urgent clinician visit ' +
      '(GP, pharmacist, dentist, specialist) within days. No self-treatment ' +
      'recommendations beyond very low-risk supportive measures.',
    llmAllowed: true,
    emergencyNumberRequired: false,
    clinicianReferralRequired: true,
    selfCareAllowed: false,
  },
  R3: {
    code: 'R3',
    label: 'Urgent care recommended',
    description:
      'Same-day or within-24h care recommended (urgent care, GP same-day, ' +
      'after-hours line). Symptoms that could escalate.',
    llmAllowed: true,
    emergencyNumberRequired: false,
    clinicianReferralRequired: true,
    selfCareAllowed: false,
  },
  R4: {
    code: 'R4',
    label: 'Emergency care recommended',
    description:
      'Symptoms that warrant going to an emergency department now. ' +
      'Includes infants under 3 months with fever, pregnancy emergencies, ' +
      'severe pediatric presentations, suspected serious infections.',
    llmAllowed: true,
    emergencyNumberRequired: true,
    clinicianReferralRequired: true,
    selfCareAllowed: false,
  },
  R5: {
    code: 'R5',
    label: 'Immediate emergency / crisis handling',
    description:
      'Life-threatening or crisis situations. Cardiovascular emergency, ' +
      'stroke, anaphylaxis, severe bleeding, loss of consciousness, ' +
      'suicidal ideation, poisoning/overdose. Response is template-driven; ' +
      'the LLM cannot soften or override.',
    llmAllowed: false,
    emergencyNumberRequired: true,
    clinicianReferralRequired: true,
    selfCareAllowed: false,
  },
};

/**
 * Order risk classes from lowest to highest severity. Useful for taking
 * the max of multiple signals.
 */
const ORDER: RiskClass[] = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];

export function maxRisk(...classes: RiskClass[]): RiskClass {
  let max = 'R0' as RiskClass;
  for (const c of classes) {
    if (ORDER.indexOf(c) > ORDER.indexOf(max)) max = c;
  }
  return max;
}

export function isAtLeast(actual: RiskClass, threshold: RiskClass): boolean {
  return ORDER.indexOf(actual) >= ORDER.indexOf(threshold);
}

/**
 * Map the legacy triage severity strings to the R0–R5 taxonomy. Used by
 * the orchestrator to bridge the existing triageMessage() output until
 * the deeper red-flag rules in red-flags.ts replace it.
 */
export function severityToRiskClass(
  severity: 'critical' | 'urgent' | 'moderate' | 'low',
): RiskClass {
  switch (severity) {
    case 'critical': return 'R5';
    case 'urgent':   return 'R4';
    case 'moderate': return 'R3';
    case 'low':      return 'R0';
  }
}

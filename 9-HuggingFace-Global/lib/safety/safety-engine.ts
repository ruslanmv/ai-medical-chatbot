/**
 * Safety engine — the orchestrator.
 *
 * preCheck()  is called BEFORE the LLM. It returns a decision: either an
 *             emergency template response (LLM not called), or a green
 *             light with a risk class + system-prompt instructions.
 * postCheck() is called AFTER the LLM. It runs the deterministic output
 *             filter and applies missing-section rules.
 *
 * Both calls produce structured metadata suitable for the existing
 * audit-log writer (lib/audit.ts) — no PHI, only ids, counts, and codes.
 */

import { triageMessage, type TriageResult } from './triage';
import { evaluateRedFlags, type PatientContext, type RedFlagMatch } from './red-flags';
import { RISK_CLASSES, severityToRiskClass, maxRisk, type RiskClass } from './risk-classes';
import { filterOutput, type OutputFilterMatch } from './output-filter';
import { getEmergencyInfo, type EmergencyInfo } from './emergency-numbers';

export interface PreCheckRequest {
  /** Sanitised user prose (already stripped of injected patient context). */
  text: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "IT". */
  countryCode: string;
  /** Optional patient context extracted from the request. */
  patientContext?: PatientContext;
}

export type PreCheckDecision =
  | {
      kind: 'emergency_template';
      riskClass: 'R5';
      reason: string;
      template: string;
      emergency: EmergencyInfo;
      audit: PreCheckAudit;
    }
  | {
      kind: 'allow_llm';
      riskClass: RiskClass;
      systemInstructions: string;
      emergency: EmergencyInfo;
      audit: PreCheckAudit;
    };

export interface PreCheckAudit {
  riskClass: RiskClass;
  triageCategory: string | null;
  ruleFires: string[];
  countryCode: string;
}

/**
 * Run the pre-LLM safety check.
 */
export function preCheck(req: PreCheckRequest): PreCheckDecision {
  const ctx = req.patientContext ?? {};
  const triage: TriageResult = triageMessage(req.text);
  const flags = evaluateRedFlags(req.text, ctx);

  const triageRisk: RiskClass = triage.isEmergency
    ? severityToRiskClass(triage.severity)
    : 'R0';
  const topRisk: RiskClass = maxRisk(triageRisk, flags.topRisk);

  const emergency = getEmergencyInfo(req.countryCode);
  const ruleFires = [
    ...(triage.isEmergency && triage.category ? [`triage:${triage.category}`] : []),
    ...flags.matches.map((m: RedFlagMatch) => m.ruleId),
  ];

  // R5: emergency template path. The LLM does NOT generate the body.
  if (topRisk === 'R5') {
    const guidance =
      flags.matches[0]?.guidance ||
      triage.guidance ||
      'This may be a medical emergency. Please call your local emergency number now.';

    const template = [
      `**Emergency**`,
      ``,
      guidance,
      ``,
      `**Call now:**`,
      `- Emergency: **${emergency.emergency}** (${emergency.country})`,
      `- Ambulance: **${emergency.ambulance}**`,
      emergency.crisisHotline ? `- Crisis line: **${emergency.crisisHotline}**` : '',
      ``,
      `Please don't wait. Every minute matters.`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      kind: 'emergency_template',
      riskClass: 'R5',
      reason: flags.matches[0]?.reason || triage.category || 'critical',
      template,
      emergency,
      audit: {
        riskClass: 'R5',
        triageCategory: triage.category,
        ruleFires,
        countryCode: req.countryCode,
      },
    };
  }

  // Build system-prompt augmentation that is ALWAYS appended before the LLM
  // generates. The post-filter is the second line of defence; this is the first.
  const spec = RISK_CLASSES[topRisk];
  const systemInstructions = [
    `[MedOS safety policy — ${spec.code}: ${spec.label}]`,
    `- Do NOT diagnose. Describe possibilities only.`,
    `- Do NOT recommend a specific medication or dose. Suggest a clinician or pharmacist.`,
    `- ${spec.selfCareAllowed ? 'Self-care suggestions are allowed for low-risk supportive measures.' : 'Do NOT recommend self-care; this situation needs professional input.'}`,
    `- ${spec.clinicianReferralRequired ? 'Recommend a clinician visit explicitly.' : 'You may suggest a clinician check-in if symptoms persist or worsen.'}`,
    `- ${spec.emergencyNumberRequired ? `Mention the local emergency number (${emergency.emergency}) explicitly.` : ''}`,
    `- Never say "you don't need a doctor".`,
    `- Stay grounded in retrieved reference material; do not invent guidelines.`,
  ]
    .filter((line) => line.trim().length > 0)
    .join('\n');

  return {
    kind: 'allow_llm',
    riskClass: topRisk,
    systemInstructions,
    emergency,
    audit: {
      riskClass: topRisk,
      triageCategory: triage.category,
      ruleFires,
      countryCode: req.countryCode,
    },
  };
}

// ───── postCheck ─────────────────────────────────────────────────────────

export interface PostCheckRequest {
  response: string;
  riskClass: RiskClass;
  emergency: EmergencyInfo;
}

export interface PostCheckResult {
  filtered: string;
  matches: OutputFilterMatch[];
  blocked: boolean;
  audit: PostCheckAudit;
}

export interface PostCheckAudit {
  riskClass: RiskClass;
  filterFires: string[];
  blocked: boolean;
  /** Whether the filter actually changed the text (rewrite or append). */
  modified: boolean;
}

/**
 * Run the post-LLM safety filter on a complete model response.
 *
 * NOTE: this is the *non-streaming* form. The streaming form runs the
 * filter on the assembled response after the model finishes — it does NOT
 * try to filter mid-stream. Streaming integration lives in the chat route.
 */
export function postCheck(req: PostCheckRequest): PostCheckResult {
  const spec = RISK_CLASSES[req.riskClass];
  const result = filterOutput(req.response, {
    riskClass: req.riskClass,
    emergencyNumberRequired: spec.emergencyNumberRequired,
    emergencyNumber: req.emergency.emergency,
    clinicianReferralRequired: spec.clinicianReferralRequired,
  });
  return {
    filtered: result.filtered,
    matches: result.matches,
    blocked: result.blocked,
    audit: {
      riskClass: req.riskClass,
      filterFires: result.matches.map((m) => m.rule),
      blocked: result.blocked,
      modified: result.filtered !== req.response,
    },
  };
}

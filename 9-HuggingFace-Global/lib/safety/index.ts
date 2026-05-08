/**
 * Public surface of the MedOS safety engine.
 *
 * The chat route should import only from this barrel — internal modules
 * remain free to evolve.
 */

export { triageMessage } from './triage';
export type { TriageResult } from './triage';

export { getDisclaimer } from './disclaimer';
export { getEmergencyInfo, EMERGENCY_NUMBERS } from './emergency-numbers';
export type { EmergencyInfo } from './emergency-numbers';

export {
  RISK_CLASSES,
  maxRisk,
  isAtLeast,
  severityToRiskClass,
} from './risk-classes';
export type { RiskClass, RiskClassSpec } from './risk-classes';

export { evaluateRedFlags, RED_FLAG_RULES } from './red-flags';
export type {
  RedFlagCategory, RedFlagMatch, RedFlagRule, PatientContext,
} from './red-flags';

export { REFUSALS } from './refusal-rules';
export type { RefusalCategory, RefusalSpec } from './refusal-rules';

export { filterOutput } from './output-filter';
export type {
  OutputFilterContext, OutputFilterMatch, OutputFilterResult,
} from './output-filter';

export { preCheck, postCheck } from './safety-engine';
export type {
  PreCheckRequest, PreCheckDecision, PreCheckAudit,
  PostCheckRequest, PostCheckResult, PostCheckAudit,
} from './safety-engine';

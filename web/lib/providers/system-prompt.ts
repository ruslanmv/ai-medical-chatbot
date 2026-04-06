/**
 * Thin compatibility layer around `lib/medical-knowledge.ts`.
 *
 * Providers import from here so we can swap prompt implementations
 * without touching every provider file.
 */
import {
  buildMedicalSystemPrompt,
  MEDICAL_SYSTEM_PROMPT_FALLBACK,
  type MedicalContext,
} from "../medical-knowledge";

export const MEDICAL_SYSTEM_PROMPT = MEDICAL_SYSTEM_PROMPT_FALLBACK;

export function resolveSystemPrompt(context?: MedicalContext): string {
  return context ? buildMedicalSystemPrompt(context) : MEDICAL_SYSTEM_PROMPT;
}

export type { MedicalContext };

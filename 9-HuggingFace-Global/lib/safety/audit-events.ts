/**
 * Typed audit-event shapes for the safety engine.
 *
 * Wraps the generic auditLog() in lib/audit.ts so that the chat route and
 * any future caller cannot accidentally log raw chat content, names, or
 * other PHI. Only the fields below are accepted.
 *
 * If you need to extend an event with a new field, add it here AND
 * confirm with PRIVACY.md that it is not PHI.
 */

import { auditLog } from '../audit';
import type { RiskClass } from './risk-classes';

export interface SafetyPreCheckEvent {
  userId?: string | null;
  ip?: string | null;
  /** Hash of the request for cross-correlation. Never the request body. */
  requestId?: string;
  /** ISO 3166-1 alpha-2 (e.g. "US", "IT"). */
  countryCode: string;
  riskClass: RiskClass;
  /** Stable rule ids that fired (e.g., RF-CARDIO-01). No free text. */
  ruleFires: string[];
  /** Whether the engine routed to an emergency template. */
  emergencyTemplate: boolean;
}

export interface SafetyPostCheckEvent {
  userId?: string | null;
  ip?: string | null;
  requestId?: string;
  countryCode: string;
  riskClass: RiskClass;
  /** Names of refusal categories or append-checks that fired. */
  filterFires: string[];
  /** True if the filter rewrote or appended to the response. */
  modified: boolean;
  /** True if the filter hard-blocked the response (replaced wholesale). */
  blocked: boolean;
  /** Provider that produced the original (pre-filter) response. */
  provider: string;
  model: string;
  /** Total request latency in ms; useful for capacity planning. */
  latencyMs?: number;
}

export function logPreCheck(event: SafetyPreCheckEvent): void {
  auditLog({
    userId: event.userId ?? null,
    action: 'chat',
    ip: event.ip ?? null,
    meta: {
      stage: 'preCheck',
      countryCode: event.countryCode,
      riskClass: event.riskClass,
      ruleFires: event.ruleFires,
      emergencyTemplate: event.emergencyTemplate,
      requestId: event.requestId,
    },
  });
}

export function logPostCheck(event: SafetyPostCheckEvent): void {
  auditLog({
    userId: event.userId ?? null,
    action: 'chat',
    ip: event.ip ?? null,
    meta: {
      stage: 'postCheck',
      countryCode: event.countryCode,
      riskClass: event.riskClass,
      filterFires: event.filterFires,
      modified: event.modified,
      blocked: event.blocked,
      provider: event.provider,
      model: event.model,
      latencyMs: event.latencyMs,
      requestId: event.requestId,
    },
  });
}

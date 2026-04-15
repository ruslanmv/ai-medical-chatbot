/**
 * Server-side patient-context builder.
 *
 * Mirrors the compact format produced by the legacy client function
 * `buildPatientContext()` in lib/health-store.ts, but reads from the
 * SQLite database scoped to ONE authenticated user. This is the
 * cross-user-leak fix: the client is never trusted to ship its own
 * EHR — the server looks it up by user_id at chat time.
 *
 * Output (kept identical so the LLM behaviour is unchanged):
 *   '\n[Patient: 47/M | Dx: Diabetes | Allergies: Penicillin | Meds: Metformin 500mg | smoker]'
 *
 * Returns '' when:
 *   - userId is empty (guest chat)
 *   - the user has no EHR profile and no active medications
 *
 * Server-only module: imports better-sqlite3 (native, Node-only).
 */

import { getDb } from './db';
import { getUserSettings } from './user-settings';
import { decodeHealthPayload } from './health-data-repo';

export function buildPatientContextForUser(userId: string | null | undefined): string {
  if (!userId) return '';

  const settings = getUserSettings(userId);
  const ehr = (settings.ehr || {}) as Record<string, any>;

  const db = getDb();
  const medRows = db
    .prepare(
      `SELECT data FROM health_data
       WHERE user_id = ? AND type = 'medication'
       ORDER BY updated_at DESC`,
    )
    .all(userId) as Array<{ data: string }>;

  const meds = medRows
    .map((r) => {
      try {
        return decodeHealthPayload<Record<string, any>>(r.data);
      } catch {
        return null;
      }
    })
    .filter((m) => m && typeof m === 'object' && (m as any).active !== false);

  const bits: string[] = [];

  // Demographics (age + gender initial).
  const demo: string[] = [];
  if (ehr.dateOfBirth) {
    const t = new Date(ehr.dateOfBirth).getTime();
    if (Number.isFinite(t)) {
      const age = Math.floor((Date.now() - t) / (365.25 * 86400000));
      if (age >= 0 && age < 130) demo.push(`${age}y`);
    }
  }
  if (ehr.gender && ehr.gender !== 'prefer-not-to-say') {
    demo.push(String(ehr.gender)[0].toUpperCase());
  }
  if (demo.length) bits.push(demo.join('/'));

  // Chronic conditions — most important for clinical context.
  if (Array.isArray(ehr.chronicConditions) && ehr.chronicConditions.length) {
    bits.push(`Dx: ${ehr.chronicConditions.join(', ')}`);
  }

  // Allergies — safety-critical.
  if (
    Array.isArray(ehr.allergies) &&
    ehr.allergies.length &&
    !ehr.allergies.includes('None known')
  ) {
    bits.push(`Allergies: ${ehr.allergies.join(', ')}`);
  }

  // Active medications — abbreviated to name + dose.
  if (meds.length > 0) {
    bits.push(
      `Meds: ${meds
        .map((m: any) => `${m.name || '?'} ${m.dose || ''}`.trim())
        .join(', ')}`,
    );
  }

  // Lifestyle — compact.
  const life: string[] = [];
  if (ehr.smokingStatus === 'current') life.push('smoker');
  if (ehr.smokingStatus === 'former') life.push('ex-smoker');
  if (ehr.alcoholUse === 'heavy') life.push('heavy alcohol');
  if (life.length) bits.push(life.join(', '));

  if (bits.length === 0) return '';
  return `\n[Patient: ${bits.join(' | ')}]`;
}

/**
 * Defence-in-depth: strip any client-provided `[Patient: ...]` block
 * from a user message before it hits the LLM. Even if a malicious or
 * stale client tries to smuggle EHR claims, the server's own
 * buildPatientContextForUser() output is the only one that reaches
 * the model.
 *
 * Matches the bracketed token at the start of a line (with optional
 * leading newline) and trims one trailing newline if present.
 */
export function stripInjectedPatientContext(content: string): string {
  if (!content) return '';
  // Multi-line, case-sensitive, non-greedy until newline or end.
  return content
    .replace(/(^|\n)\s*\[Patient:[^\]\n]*\](?=\n|$)/g, '')
    .replace(/^\n+/, '');
}

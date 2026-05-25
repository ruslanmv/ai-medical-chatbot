/**
 * Server-side patient-context builder.
 *
 * Reads from the SQLite database scoped to ONE authenticated user. This is the
 * cross-user-leak fix: the client is never trusted to ship its own EHR for
 * an authenticated session — the server looks it up by user_id at chat time.
 *
 * Output (XML-tagged block the LLM is taught to consume in
 * `buildMedicalSystemPrompt`):
 *   '\n<patient_context>\nage=47 sex=M\nconditions=Diabetes\nallergies=Penicillin\nmedications=Metformin 500mg\nlifestyle=smoker\n</patient_context>'
 *
 * Returns '' when:
 *   - userId is empty (guest chat — client-side context survives)
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

  const lines: string[] = [];

  // Demographics — clinical signal for differential weighting.
  const demo: string[] = [];
  if (ehr.dateOfBirth) {
    const t = new Date(ehr.dateOfBirth).getTime();
    if (Number.isFinite(t)) {
      const age = Math.floor((Date.now() - t) / (365.25 * 86400000));
      if (age >= 0 && age < 130) demo.push(`age=${age}`);
    }
  }
  if (ehr.gender && ehr.gender !== 'prefer-not-to-say') {
    demo.push(`sex=${String(ehr.gender)[0].toUpperCase()}`);
  }
  if (demo.length) lines.push(demo.join(' '));

  if (Array.isArray(ehr.chronicConditions) && ehr.chronicConditions.length) {
    lines.push(`conditions=${ehr.chronicConditions.join(', ')}`);
  }

  if (
    Array.isArray(ehr.allergies) &&
    ehr.allergies.length &&
    !ehr.allergies.includes('None known')
  ) {
    lines.push(`allergies=${ehr.allergies.join(', ')}`);
  }

  if (meds.length > 0) {
    lines.push(
      `medications=${meds
        .map((m: any) => `${m.name || '?'} ${m.dose || ''}`.trim())
        .join(', ')}`,
    );
  }

  const life: string[] = [];
  if (ehr.smokingStatus === 'current') life.push('smoker');
  else if (ehr.smokingStatus === 'former') life.push('ex-smoker');
  if (ehr.alcoholUse === 'heavy') life.push('heavy alcohol');
  if (life.length) lines.push(`lifestyle=${life.join(', ')}`);

  if (lines.length === 0) return '';
  return `\n<patient_context>\n${lines.join('\n')}\n</patient_context>`;
}

/**
 * Defence-in-depth: strip any client-provided patient-context block
 * from a message before it hits the LLM. Recognises BOTH formats:
 *
 *   1. New: `<patient_context>...</patient_context>` (current builder).
 *   2. Legacy: `[Patient: ...]` (older clients, in-flight conversations
 *      from before the format change).
 *
 * Always called on PRIOR turns (anti-stale-leak). For the CURRENT turn
 * the chat route only strips when the user is authenticated — because
 * for authenticated users the server re-derives the truth from the DB,
 * while for guests the client's localStorage-built block is the only
 * personalization signal available.
 */
export function stripInjectedPatientContext(content: string): string {
  if (!content) return '';
  return content
    .replace(/\n?<patient_context>[\s\S]*?<\/patient_context>\s*/gi, '')
    .replace(/(^|\n)\s*\[Patient:[^\]\n]*\](?=\n|$)/g, '')
    .replace(/^\n+/, '');
}

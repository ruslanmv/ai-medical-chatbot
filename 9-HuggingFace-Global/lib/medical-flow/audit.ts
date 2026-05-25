/**
 * Medical-flow audit log.
 *
 * Every card emission and care-level classification produces an audit
 * record. These records are written to the same SQLite DB the rest of
 * MedOS uses (better-sqlite3, server-only) and are scoped to a single
 * user — anonymous conversations are logged with `user_id = NULL` so
 * the schema remains uniform.
 *
 * Why this matters for the enterprise pitch:
 *
 *   1. Medico-legal defensibility — a reviewer can replay any
 *      conversation and see exactly which card the server emitted,
 *      with what answers, at what care level, and why. ChatGPT can't
 *      produce this record.
 *
 *   2. Benchmarking — the `medical_flow_audit` table feeds the
 *      `benchmarks/` harness directly: count emergency escalations,
 *      profile-gate fire rate, doctor-summary export rate, etc.
 *
 *   3. Operator visibility — the admin Analytics tab gets a new
 *      "Care-level distribution" panel reading the same table.
 *
 * PHI handling: we store the structured answers (severity, duration,
 * red-flag tokens) but NOT the user's free-text turns — those stay in
 * the existing chat-history table where the privacy controls already
 * apply. The audit table is operational telemetry, not message
 * archive.
 */

import { getDb } from '../db';
import type { Card } from './types';

let _initialized = false;

/** Idempotent. Runs on first call and is cheap to retry — used at
 *  module load to defer the schema setup until the DB is actually
 *  available (Next.js cold-start). */
function ensureSchema(): void {
  if (_initialized) return;
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS medical_flow_audit (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        user_id         TEXT,                  -- NULL = anonymous turn
        conversation_id TEXT,                  -- groups turns within one conversation
        card_kind       TEXT NOT NULL,         -- greeting / safety_check / intake / guidance / next_steps / doctor_summary / profile_gate
        flow_id         TEXT,                  -- back-pain / headache / abdominal-pain / NULL for non-symptom cards
        care_level      TEXT,                  -- self-care / routine / urgent / emergency / NULL when N/A
        red_flags       TEXT,                  -- JSON array of selected red-flag tokens
        severity        INTEGER,               -- 0..10 or NULL
        duration_bucket TEXT,                  -- today / 1-3d / 4-7d / gt1w / gt1m / NULL
        location_bucket TEXT,                  -- lower / middle / upper / side / radiates / NULL
        country         TEXT,
        language        TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_mfa_created ON medical_flow_audit (created_at);
      CREATE INDEX IF NOT EXISTS ix_mfa_user    ON medical_flow_audit (user_id);
      CREATE INDEX IF NOT EXISTS ix_mfa_kind    ON medical_flow_audit (card_kind);
      CREATE INDEX IF NOT EXISTS ix_mfa_care    ON medical_flow_audit (care_level);
    `);
    _initialized = true;
  } catch (e: any) {
    // Don't crash the chat route on audit failure — the LLM path is
    // the user-visible behavior. Log once and skip.
    console.warn('[medical-flow.audit] schema init failed:', e?.message);
  }
}

interface AuditEntry {
  user_id: string | null;
  conversation_id?: string | null;
  card: Card;
  flow_id?: string;
  answers?: {
    severity?: number;
    duration?: string;
    location?: string;
    red_flags_selected?: string[];
  };
  country?: string;
  language?: string;
}

/** Insert one audit row. Best-effort — never throws.
 *
 *  Cheap (~0.2 ms on SQLite); fine to call inline on the chat-route
 *  hot path. */
export function recordCardEmission(entry: AuditEntry): void {
  ensureSchema();
  try {
    const db = getDb();
    const care_level =
      entry.card.kind === 'guidance' ? entry.card.care_level : null;
    db.prepare(
      `INSERT INTO medical_flow_audit
       (user_id, conversation_id, card_kind, flow_id, care_level,
        red_flags, severity, duration_bucket, location_bucket,
        country, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      entry.user_id,
      entry.conversation_id || null,
      entry.card.kind,
      entry.flow_id || null,
      care_level,
      entry.answers?.red_flags_selected
        ? JSON.stringify(entry.answers.red_flags_selected)
        : null,
      entry.answers?.severity ?? null,
      entry.answers?.duration || null,
      entry.answers?.location || null,
      entry.country || null,
      entry.language || null,
    );
  } catch (e: any) {
    console.warn('[medical-flow.audit] insert failed:', e?.message);
  }
}

/** Aggregate read for the admin dashboard. Returns counts of card
 *  emissions per (kind, care_level) bucket in the given time window. */
export function summary(opts: { sinceISO?: string } = {}): {
  by_kind: Record<string, number>;
  by_care_level: Record<string, number>;
  by_flow: Record<string, number>;
  total: number;
} {
  ensureSchema();
  try {
    const db = getDb();
    const since = opts.sinceISO || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const rows = db
      .prepare(
        `SELECT card_kind, care_level, flow_id, COUNT(*) AS n
         FROM medical_flow_audit
         WHERE created_at >= ?
         GROUP BY card_kind, care_level, flow_id`,
      )
      .all(since) as Array<{
        card_kind: string;
        care_level: string | null;
        flow_id: string | null;
        n: number;
      }>;
    const by_kind: Record<string, number> = {};
    const by_care_level: Record<string, number> = {};
    const by_flow: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      by_kind[r.card_kind] = (by_kind[r.card_kind] || 0) + r.n;
      if (r.care_level) by_care_level[r.care_level] = (by_care_level[r.care_level] || 0) + r.n;
      if (r.flow_id) by_flow[r.flow_id] = (by_flow[r.flow_id] || 0) + r.n;
      total += r.n;
    }
    return { by_kind, by_care_level, by_flow, total };
  } catch {
    return { by_kind: {}, by_care_level: {}, by_flow: {}, total: 0 };
  }
}

/**
 * MedOS audit log.
 *
 * Append-only record of security-relevant actions. Used for forensic
 * review ("who changed the SMTP password yesterday?"), incident response,
 * and compliance evidence. NOT for billing or analytics — keep the schema
 * narrow and the cardinality bounded.
 *
 * Design rules:
 *   - Failures NEVER throw. A broken audit log must not break the request.
 *   - No PHI / PII in `meta`. Use ids, counts, durations, status codes only.
 *   - Add new actions to AuditAction explicitly; do not accept arbitrary
 *     strings (catches typos and prevents log explosion).
 */

import { getDb, genId } from './db';

export type AuditAction =
  // auth lifecycle
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'verify_email'
  | 'password_reset_request'
  | 'password_reset'
  | 'password_change'
  | 'delete_account'
  // admin
  | 'admin_login'
  | 'admin_action'
  | 'admin_user_delete'
  | 'admin_user_reset_password'
  | 'admin_config_update'
  | 'token_rotate'
  // user data
  | 'chat'
  | 'scan'
  | 'health_data_write'
  | 'health_data_delete'
  | 'settings_update'
  | 'export_data';

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  ip?: string | null;
  meta?: Record<string, any>;
}

/**
 * Write an audit entry. Synchronous SQLite write — cheap on local FS.
 * Wrapped in try/catch so a logging failure can never propagate.
 */
export function auditLog(entry: AuditEntry): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (id, user_id, action, ip, meta)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      genId(),
      entry.userId || null,
      entry.action,
      entry.ip || null,
      JSON.stringify(entry.meta || {}),
    );
  } catch (e: any) {
    console.error('[Audit] write failed:', e?.message);
  }
}

/**
 * Page through the audit log for the admin UI. Filter by user, action,
 * and time range; default page size 50, hard cap 500.
 */
export function queryAudit(opts: {
  userId?: string;
  action?: AuditAction;
  since?: string; // ISO
  limit?: number;
  offset?: number;
}): Array<{
  id: string;
  userId: string | null;
  action: string;
  ip: string | null;
  meta: any;
  createdAt: string;
}> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const where: string[] = [];
  const params: any[] = [];
  if (opts.userId) {
    where.push('user_id = ?');
    params.push(opts.userId);
  }
  if (opts.action) {
    where.push('action = ?');
    params.push(opts.action);
  }
  if (opts.since) {
    where.push('created_at >= ?');
    params.push(opts.since);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, action, ip, meta, created_at
       FROM audit_log
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    action: r.action,
    ip: r.ip,
    meta: (() => {
      try {
        return JSON.parse(r.meta);
      } catch {
        return {};
      }
    })(),
    createdAt: r.created_at,
  }));
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';
import { auditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

/**
 * Per-user admin endpoints — safe, non-destructive operations.
 *
 *   GET   /api/admin/users/:id   → full user profile (admin-only)
 *   PATCH /api/admin/users/:id   → change role / active state / force-logout
 *
 * Why PATCH and not POST/PUT:
 *   - PATCH advertises "partial update of an existing resource" which
 *     matches how the admin UI will call this (flip one field at a time).
 *   - DELETE already exists at the collection level for hard delete.
 *     Deactivation via PATCH is the preferred, reversible alternative.
 *
 * Actions accepted in the body (any subset, all optional):
 *   - isAdmin:        boolean  → promote / demote
 *   - isActive:       boolean  → enable / disable the account
 *   - disabledReason: string   → stored alongside isActive=false
 *   - forceLogout:    boolean  → drop every active session for this user
 *
 * Safety rails:
 *   - An admin cannot demote or deactivate themselves via this endpoint
 *     (would create an unrecoverable lock-out if they were the last admin).
 *   - Every mutation writes to audit_log with the before/after summary.
 */

const PatchSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    isActive: z.boolean().optional(),
    disabledReason: z.string().max(500).optional(),
    forceLogout: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.isAdmin !== undefined ||
      v.isActive !== undefined ||
      v.disabledReason !== undefined ||
      v.forceLogout === true,
    { message: 'No actionable field provided' },
  );

function readUser(db: any, id: string) {
  return db
    .prepare(
      `SELECT id, email, display_name, email_verified, is_admin,
              COALESCE(is_active, 1) AS is_active, disabled_reason,
              last_login_at, created_at
       FROM users WHERE id = ?`,
    )
    .get(id) as any;
}

function shape(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    emailVerified: !!row.email_verified,
    isAdmin: !!row.is_admin,
    isActive: !!row.is_active,
    disabledReason: row.disabled_reason || null,
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const db = getDb();
  const row = readUser(db, params.id);
  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user: shape(row) });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid payload' },
      { status: 400 },
    );
  }
  const patch = parsed.data;

  const db = getDb();
  const before = readUser(db, params.id);
  if (!before) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Safety rail — no self-demotion or self-deactivation.
  if (admin.id === params.id) {
    if (patch.isAdmin === false) {
      return NextResponse.json(
        { error: 'An admin cannot demote their own account.' },
        { status: 400 },
      );
    }
    if (patch.isActive === false) {
      return NextResponse.json(
        { error: 'An admin cannot deactivate their own account.' },
        { status: 400 },
      );
    }
  }

  // Build the UPDATE dynamically so we only touch the fields the admin
  // actually passed. Static prepared statement per combination would be
  // ideal, but cardinality is tiny and this keeps the audit diff honest.
  const sets: string[] = [];
  const values: any[] = [];
  const diff: Record<string, { before: any; after: any }> = {};

  if (patch.isAdmin !== undefined && !!before.is_admin !== patch.isAdmin) {
    sets.push('is_admin = ?');
    values.push(patch.isAdmin ? 1 : 0);
    diff.isAdmin = { before: !!before.is_admin, after: patch.isAdmin };
  }
  if (patch.isActive !== undefined && !!before.is_active !== patch.isActive) {
    sets.push('is_active = ?');
    values.push(patch.isActive ? 1 : 0);
    diff.isActive = { before: !!before.is_active, after: patch.isActive };
    // Clear disabled_reason automatically when re-activating.
    if (patch.isActive === true) {
      sets.push('disabled_reason = NULL');
      diff.disabledReason = { before: before.disabled_reason || null, after: null };
    }
  }
  if (patch.disabledReason !== undefined) {
    sets.push('disabled_reason = ?');
    values.push(patch.disabledReason || null);
    diff.disabledReason = {
      before: before.disabled_reason || null,
      after: patch.disabledReason || null,
    };
  }

  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(
      ...values,
      params.id,
    );
  }

  // forceLogout and isActive=false both revoke sessions. We do it in a
  // single DELETE to keep the state transition atomic with the update.
  let revoked = 0;
  if (patch.forceLogout || patch.isActive === false) {
    const info = db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .run(params.id);
    revoked = info.changes;
  }

  auditLog({
    userId: admin.id,
    action: 'admin_action',
    ip: getClientIp(req),
    meta: {
      target_user: params.id,
      sub_action:
        patch.forceLogout && sets.length === 0
          ? 'force_logout'
          : 'user_update',
      diff,
      sessions_revoked: revoked,
    },
  });

  const after = readUser(db, params.id);
  return NextResponse.json({
    user: shape(after),
    sessionsRevoked: revoked,
    changed: Object.keys(diff),
  });
}

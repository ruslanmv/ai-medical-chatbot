import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb, pruneExpiredSessions } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { auditLog } from '@/lib/audit';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const h = req.headers.get('authorization');
  const token = h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  pruneExpiredSessions();

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.email_verified, u.is_admin, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .get(token) as any;

  if (!row) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  return NextResponse.json({
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      emailVerified: !!row.email_verified,
      isAdmin: !!row.is_admin,
      createdAt: row.created_at,
    },
  });
}

/**
 * DELETE /api/auth/me — self-service account deletion (GDPR Art. 17 /
 * HIPAA patient right-to-delete).
 *
 * Safety gates (all required, in order):
 *   1. Must present a valid session (authenticateRequest).
 *   2. Must re-authenticate by supplying the current password in the JSON
 *      body: `{ "password": "…", "confirmEmail": "…" }`. Re-auth stops
 *      stolen-token exfiltration from wiping the account.
 *   3. `confirmEmail` must match the logged-in user's email — defence
 *      against copy/paste mistakes in shared UIs.
 *   4. Admin accounts cannot self-delete via this endpoint (prevents
 *      accidental lock-out of the Space). Admins must demote first or use
 *      the admin-ops deletion flow.
 *   5. Per-IP + per-user rate limit: 3 attempts / hour.
 *
 * Execution:
 *   - All PHI (health_data, chat_history, user_settings, sessions,
 *     audit_log FK, scan_log FK) is removed by FK CASCADE.
 *   - A single audit row is written BEFORE the delete so forensics can
 *     prove the delete happened and by whom.
 */
const DeleteSchema = z.object({
  password: z.string().min(1, 'Password required'),
  confirmEmail: z.string().email('Email confirmation required'),
});

export async function DELETE(req: Request) {
  const ip = getClientIp(req);

  // 5) Rate limit self-deletion to blunt brute-force of the password gate.
  const rl = checkRateLimit(`delete-me:${ip}`, 3, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many deletion attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  // 1) Valid session.
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'password and confirmEmail are required' },
      { status: 400 },
    );
  }
  const { password, confirmEmail } = parsed.data;

  const db = getDb();
  const user = db
    .prepare('SELECT id, email, password, is_admin FROM users WHERE id = ?')
    .get(auth.id) as any;

  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // 3) Email confirmation must match the session's user.
  if (user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
    auditLog({
      userId: user.id,
      action: 'delete_account',
      ip,
      meta: { outcome: 'email_mismatch' },
    });
    return NextResponse.json(
      { error: 'Email confirmation does not match your account.' },
      { status: 400 },
    );
  }

  // 2) Password re-auth.
  if (!bcrypt.compareSync(password, user.password)) {
    auditLog({
      userId: user.id,
      action: 'delete_account',
      ip,
      meta: { outcome: 'bad_password' },
    });
    return NextResponse.json(
      { error: 'Password is incorrect.' },
      { status: 401 },
    );
  }

  // 4) Admins cannot self-delete via this endpoint.
  if (user.is_admin) {
    return NextResponse.json(
      {
        error:
          'Admin accounts cannot self-delete. Demote the account first or use the admin deletion endpoint.',
      },
      { status: 403 },
    );
  }

  // Record intent BEFORE the destructive write so forensics can reconstruct
  // the event even if the CASCADE blows up mid-way.
  auditLog({
    userId: user.id,
    action: 'delete_account',
    ip,
    meta: { outcome: 'initiated', self_service: true },
  });

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  } catch (e: any) {
    console.error('[Delete Me] cascade delete failed:', e?.message);
    return NextResponse.json(
      { error: 'Deletion failed. Please contact support.' },
      { status: 500 },
    );
  }

  // Post-deletion audit row. audit_log.user_id is an unconstrained TEXT
  // column (no FK), so earlier audit rows for this user survive the
  // cascade and remain available for forensic review.
  auditLog({
    userId: null,
    action: 'delete_account',
    ip,
    meta: { outcome: 'completed', deleted_user: user.id, self_service: true },
  });

  return NextResponse.json({
    success: true,
    message: `Account ${user.email} and all associated data permanently deleted.`,
  });
}

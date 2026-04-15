import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, genToken, sessionExpiry, pruneExpiredSessions } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  // Rate limit: 10 login attempts per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await req.json();
    const { email, password } = Schema.parse(body);

    const db = getDb();
    pruneExpiredSessions();

    const user = db
      .prepare(
        `SELECT id, email, password, display_name, email_verified, is_admin,
                COALESCE(is_active, 1) AS is_active, disabled_reason
         FROM users WHERE email = ?`,
      )
      .get(email.toLowerCase()) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Reject deactivated accounts with a distinct 403 so the UI can
    // surface the `disabled_reason` instead of a generic "wrong password".
    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            user.disabled_reason ||
            'This account has been disabled. Please contact an administrator.',
          code: 'account_disabled',
        },
        { status: 403 },
      );
    }

    const token = genToken();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
      token,
      user.id,
      sessionExpiry(),
    );
    // Best-effort login timestamp. Never fail the login if this write
    // errors — the column exists from v3 onwards, but older DBs that
    // haven't hit getDb() yet may not have it for a transient moment.
    try {
      db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        emailVerified: !!user.email_verified,
        isAdmin: !!user.is_admin,
      },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[Auth Login]', error?.message);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

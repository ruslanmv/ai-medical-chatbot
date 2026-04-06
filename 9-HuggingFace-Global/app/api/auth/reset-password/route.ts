import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, genToken, sessionExpiry } from '@/lib/db';

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6).max(128),
});

/**
 * POST /api/auth/reset-password — reset password with the 6-digit code.
 * On success, auto-logs the user in and returns a session token.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, newPassword } = Schema.parse(body);

    const db = getDb();
    const user = db
      .prepare('SELECT id, reset_token, reset_expires FROM users WHERE email = ?')
      .get(email.toLowerCase()) as any;

    if (
      !user ||
      user.reset_token !== code ||
      !user.reset_expires ||
      new Date(user.reset_expires) < new Date()
    ) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(
      `UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(hash, user.id);

    // Invalidate all existing sessions for this user (security best practice).
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    // Auto-login with new session.
    const token = genToken();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
      token,
      user.id,
      sessionExpiry(),
    );

    return NextResponse.json({
      message: 'Password reset successfully',
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('[Auth ResetPassword]', error?.message);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

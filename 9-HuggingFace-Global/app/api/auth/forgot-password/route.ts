import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, genVerificationCode, resetExpiry } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const Schema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password — sends a reset code to the user's email.
 *
 * Always returns 200 even if the email doesn't exist (prevents email enumeration).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = Schema.parse(body);

    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase()) as any;

    if (user) {
      const code = genVerificationCode();
      db.prepare(
        `UPDATE users SET reset_token = ?, reset_expires = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(code, resetExpiry(), user.id);

      await sendPasswordResetEmail(user.email, code);
    }

    // Always return success to prevent email enumeration.
    return NextResponse.json({
      message: 'If that email is registered, a reset code has been sent.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    console.error('[Auth ForgotPassword]', error?.message);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}

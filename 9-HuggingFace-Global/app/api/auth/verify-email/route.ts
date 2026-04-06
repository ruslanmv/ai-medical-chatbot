import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { sendWelcomeEmail } from '@/lib/email';

const Schema = z.object({
  code: z.string().length(6),
});

/**
 * POST /api/auth/verify-email — verify email with 6-digit code.
 * Requires auth (the user must be logged in to verify their own email).
 */
export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const body = await req.json();
    const { code } = Schema.parse(body);

    const db = getDb();
    const row = db
      .prepare(
        `SELECT verification_code, verification_expires, email, email_verified
         FROM users WHERE id = ?`,
      )
      .get(user.id) as any;

    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (row.email_verified) return NextResponse.json({ message: 'Email already verified' });

    if (
      row.verification_code !== code ||
      !row.verification_expires ||
      new Date(row.verification_expires) < new Date()
    ) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    db.prepare(
      `UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(user.id);

    // Send welcome email
    sendWelcomeEmail(row.email).catch(() => {});

    return NextResponse.json({ message: 'Email verified successfully', emailVerified: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }
    console.error('[Auth Verify]', error?.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb, genVerificationCode, codeExpiry } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { sendVerificationEmail, emailTransportName } from '@/lib/email';

/**
 * POST /api/auth/resend-verification — resend the 6-digit verification code.
 */
export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const row = db.prepare('SELECT email, email_verified FROM users WHERE id = ?').get(user.id) as any;

  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (row.email_verified) return NextResponse.json({ message: 'Email already verified' });

  const code = genVerificationCode();
  db.prepare(
    `UPDATE users SET verification_code = ?, verification_expires = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(code, codeExpiry(), user.id);

  console.log(`[ResendVerification] queued via transport=${emailTransportName()} to=${row.email}`);
  const sent = await sendVerificationEmail(row.email, code);
  if (!sent) console.error(`[ResendVerification] FAILED to=${row.email}`);

  return NextResponse.json({ message: 'Verification code sent' });
}

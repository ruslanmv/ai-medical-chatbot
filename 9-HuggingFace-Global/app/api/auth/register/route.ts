import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, genId, genToken, genVerificationCode, codeExpiry, sessionExpiry } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const Schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  // Rate limit: 5 registrations per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`register:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please wait.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await req.json();
    const { email, password, displayName } = Schema.parse(body);

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const id = genId();
    const hash = bcrypt.hashSync(password, 10);
    const code = genVerificationCode();
    const expires = codeExpiry();

    db.prepare(
      `INSERT INTO users (id, email, password, display_name, verification_code, verification_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, email.toLowerCase(), hash, displayName || null, code, expires);

    // Auto-login
    const token = genToken();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, id, sessionExpiry());

    // Send verification email (best-effort, don't block registration)
    sendVerificationEmail(email, code).catch(() => {});

    return NextResponse.json(
      {
        user: { id, email: email.toLowerCase(), displayName, emailVerified: false },
        token,
        message: 'Account created. Check your email for a verification code.',
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('[Auth Register]', error?.message);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

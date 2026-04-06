import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, genToken, sessionExpiry, pruneExpiredSessions } from '@/lib/db';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = Schema.parse(body);

    const db = getDb();
    pruneExpiredSessions();

    const user = db
      .prepare('SELECT id, email, password, display_name, email_verified, is_admin FROM users WHERE email = ?')
      .get(email.toLowerCase()) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = genToken();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
      token,
      user.id,
      sessionExpiry(),
    );

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

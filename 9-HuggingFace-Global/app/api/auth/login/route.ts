import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  getDb,
  genToken,
  sessionExpiry,
  pruneExpiredSessions,
} from '@/lib/db';

const Schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = Schema.parse(body);

    const db = getDb();
    pruneExpiredSessions();

    const user = db
      .prepare(
        'SELECT id, username, password, email, display_name FROM users WHERE username = ?',
      )
      .get(username) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const token = genToken();
    db.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    ).run(token, user.id, sessionExpiry());

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
      },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      );
    }
    console.error('[Auth Login]', error?.message);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

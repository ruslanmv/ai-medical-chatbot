import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, genId, genToken, sessionExpiry } from '@/lib/db';

const Schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6).max(128),
  email: z.string().email().optional(),
  displayName: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, email, displayName } = Schema.parse(body);

    const db = getDb();

    // Check if username already taken
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);
    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 },
      );
    }

    const id = genId();
    const hash = bcrypt.hashSync(password, 10);

    db.prepare(
      'INSERT INTO users (id, username, password, email, display_name) VALUES (?, ?, ?, ?, ?)',
    ).run(id, username, hash, email || null, displayName || null);

    // Auto-login: create session
    const token = genToken();
    db.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    ).run(token, id, sessionExpiry());

    return NextResponse.json(
      {
        user: { id, username, email, displayName },
        token,
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Auth Register]', error?.message);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 },
    );
  }
}

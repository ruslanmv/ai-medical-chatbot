import { NextResponse } from 'next/server';
import { getDb, pruneExpiredSessions } from '@/lib/db';

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

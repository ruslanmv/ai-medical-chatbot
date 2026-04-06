import { NextResponse } from 'next/server';
import { getDb, pruneExpiredSessions } from '@/lib/db';

/**
 * GET /api/auth/me — returns the current authenticated user.
 * Auth token is read from `Authorization: Bearer <token>` header.
 */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  pruneExpiredSessions();

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.display_name, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .get(token) as any;

  if (!row) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at,
    },
  });
}

function extractToken(req: Request): string | null {
  const h = req.headers.get('authorization');
  if (h && h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

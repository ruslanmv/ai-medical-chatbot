import { getDb, pruneExpiredSessions } from './db';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export function authenticateRequest(req: Request): AuthUser | null {
  const h = req.headers.get('authorization');
  const token = h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  if (!token) return null;

  const db = getDb();
  pruneExpiredSessions();

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.is_admin
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .get(token) as any;

  return row ? { id: row.id, email: row.email, isAdmin: !!row.is_admin } : null;
}

/** Require admin — returns null if not admin. */
export function requireAdmin(req: Request): AuthUser | null {
  const user = authenticateRequest(req);
  return user?.isAdmin ? user : null;
}

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

  // Deactivated accounts (is_active = 0) must not authenticate even if
  // they still have a valid session token. The WHERE clause uses
  // `COALESCE(..., 1)` so that on DBs where the v3 column has not yet
  // been added the session still resolves — belt + braces for upgrades.
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.is_admin
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?
         AND s.expires_at > datetime('now')
         AND COALESCE(u.is_active, 1) = 1`,
    )
    .get(token) as any;

  return row ? { id: row.id, email: row.email, isAdmin: !!row.is_admin } : null;
}

/** Require admin — returns null if not admin. */
export function requireAdmin(req: Request): AuthUser | null {
  const user = authenticateRequest(req);
  return user?.isAdmin ? user : null;
}

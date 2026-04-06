/**
 * Shared auth helper for protected API routes.
 * Extracts the Bearer token, validates the session, and returns the user ID.
 * Returns null if unauthenticated — callers decide whether to 401 or proceed as guest.
 */

import { getDb, pruneExpiredSessions } from './db';

export interface AuthUser {
  id: string;
  username: string;
}

export function authenticateRequest(req: Request): AuthUser | null {
  const h = req.headers.get('authorization');
  const token = h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  if (!token) return null;

  const db = getDb();
  pruneExpiredSessions();

  const row = db
    .prepare(
      `SELECT u.id, u.username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .get(token) as any;

  return row ? { id: row.id, username: row.username } : null;
}

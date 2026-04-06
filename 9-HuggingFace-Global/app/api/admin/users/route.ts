import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';

/**
 * GET /api/admin/users — list all registered users (admin only).
 * Query params: ?page=1&limit=50&search=term
 */
export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const search = url.searchParams.get('search')?.trim();
  const offset = (page - 1) * limit;

  const db = getDb();

  const where = search ? "WHERE email LIKE ? OR display_name LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const total = (db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params) as any).c;

  const rows = db
    .prepare(
      `SELECT id, email, display_name, email_verified, is_admin, created_at
       FROM users ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[];

  // Health data count per user.
  const users = rows.map((r) => {
    const healthCount = (
      db.prepare('SELECT COUNT(*) as c FROM health_data WHERE user_id = ?').get(r.id) as any
    ).c;
    const chatCount = (
      db.prepare('SELECT COUNT(*) as c FROM chat_history WHERE user_id = ?').get(r.id) as any
    ).c;
    return {
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      emailVerified: !!r.email_verified,
      isAdmin: !!r.is_admin,
      createdAt: r.created_at,
      healthDataCount: healthCount,
      chatHistoryCount: chatCount,
    };
  });

  return NextResponse.json({ users, total, page, limit });
}

/**
 * DELETE /api/admin/users?id=<userId> — delete a user (admin only).
 * CASCADE deletes all their health data, chat history, and sessions.
 */
export async function DELETE(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const url = new URL(req.url);
  const userId = url.searchParams.get('id');
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

  // Prevent deleting yourself.
  if (userId === admin.id) {
    return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  return NextResponse.json({ success: true });
}

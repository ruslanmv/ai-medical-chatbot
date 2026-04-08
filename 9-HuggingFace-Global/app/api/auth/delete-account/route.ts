import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * POST /api/auth/delete-account — GDPR right to deletion.
 *
 * Permanently deletes the authenticated user's account and ALL
 * associated data (health records, chat history, sessions).
 * Uses CASCADE deletes via foreign keys — one operation wipes everything.
 *
 * This is irreversible. The frontend should confirm before calling.
 */
export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Prevent admin self-deletion via this endpoint
  // (admins can be deleted via /api/admin/users if needed)
  if (user.isAdmin) {
    return NextResponse.json(
      { error: 'Admin accounts cannot be self-deleted. Contact another admin.' },
      { status: 403 },
    );
  }

  try {
    const db = getDb();

    // CASCADE deletes handle: sessions, health_data, chat_history
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('[Delete Account]', error?.message);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

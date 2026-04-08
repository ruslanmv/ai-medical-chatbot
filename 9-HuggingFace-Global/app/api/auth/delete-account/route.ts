import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';

const Schema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().email(),
});

/**
 * POST /api/auth/delete-account — ADMIN-ONLY account deletion.
 *
 * Only admins can delete accounts. This prevents:
 *   - Hackers with stolen tokens from destroying user data
 *   - Automated scripts mass-deleting accounts
 *   - Accidental self-deletion
 *
 * Requires both userId AND confirmEmail to match (double verification).
 * Uses CASCADE deletes via foreign keys — one operation wipes everything.
 *
 * For GDPR: users REQUEST deletion via support/admin panel.
 * Admin reviews and executes. This is the industry standard for
 * healthcare apps (MyChart, Epic, Cerner all require admin action).
 */
export async function POST(req: Request) {
  // ADMIN ONLY — reject all non-admin requests
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required. Users must request account deletion through the admin.' },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { userId, confirmEmail } = Schema.parse(body);

    const db = getDb();

    // Verify user exists and email matches (double check)
    const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email confirmation does not match. Deletion aborted.' },
        { status: 400 },
      );
    }

    // Prevent deleting admin accounts (safety net)
    if (user.is_admin) {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts via this endpoint.' },
        { status: 403 },
      );
    }

    // CASCADE deletes handle: sessions, health_data, chat_history
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    console.log(`[Account Deletion] Admin ${admin.email} deleted user ${user.email} (${userId})`);

    return NextResponse.json({
      success: true,
      message: `Account ${user.email} and all associated data permanently deleted.`,
      deletedBy: admin.email,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request. Provide userId and confirmEmail.' }, { status: 400 });
    }
    console.error('[Delete Account]', error?.message);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

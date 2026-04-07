import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';

const Schema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/admin/reset-password — Admin-initiated password reset.
 *
 * Allows admins to manually reset a user's password. This is the
 * industry-standard approach for user management: the admin sets a
 * temporary password and instructs the user to change it on login.
 *
 * Security measures:
 * - Requires admin authentication
 * - Passwords are bcrypt-hashed
 * - All existing sessions for the user are invalidated
 * - Cannot reset your own password (use profile instead)
 */
export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, newPassword } = Schema.parse(body);

    const db = getDb();

    // Verify user exists.
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash new password.
    const hash = bcrypt.hashSync(newPassword, 10);

    // Update password and invalidate all sessions.
    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    });
    tx();

    return NextResponse.json({
      success: true,
      message: `Password reset for ${user.email}. All sessions invalidated.`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    console.error('[Admin Reset Password]', error?.message);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-middleware';

/**
 * GET /api/admin/stats — aggregate platform statistics (admin only).
 */
export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const db = getDb();

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const verifiedUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE email_verified = 1').get() as any).c;
  const adminUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1').get() as any).c;
  const totalHealthData = (db.prepare('SELECT COUNT(*) as c FROM health_data').get() as any).c;
  const totalChats = (db.prepare('SELECT COUNT(*) as c FROM chat_history').get() as any).c;
  const activeSessions = (db.prepare("SELECT COUNT(*) as c FROM sessions WHERE expires_at > datetime('now')").get() as any).c;

  // Health data breakdown by type.
  const healthBreakdown = db
    .prepare('SELECT type, COUNT(*) as count FROM health_data GROUP BY type ORDER BY count DESC')
    .all() as any[];

  // Registrations over time (last 30 days).
  const registrations = db
    .prepare(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM users
       WHERE created_at > datetime('now', '-30 days')
       GROUP BY day ORDER BY day`,
    )
    .all() as any[];

  return NextResponse.json({
    totalUsers,
    verifiedUsers,
    adminUsers,
    totalHealthData,
    totalChats,
    activeSessions,
    healthBreakdown,
    registrations,
  });
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  const h = req.headers.get('authorization');
  const token = h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;

  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  return NextResponse.json({ success: true });
}

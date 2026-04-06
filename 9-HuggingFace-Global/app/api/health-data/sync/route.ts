import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, genId } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * POST /api/health-data/sync — bulk sync from client localStorage.
 *
 * The client sends its entire localStorage health dataset (medications,
 * appointments, vitals, records, medication_logs, conversations). The
 * server upserts each item. This runs on:
 *   - First login (migrates existing guest data to the account)
 *   - Periodic background sync while logged in
 *
 * Idempotent: calling it twice with the same data is safe.
 */

const ItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    'medication',
    'medication_log',
    'appointment',
    'vital',
    'record',
    'conversation',
  ]),
  data: z.record(z.any()),
});

const SyncSchema = z.object({
  items: z.array(ItemSchema).max(5000),
});

export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items } = SyncSchema.parse(body);

    const db = getDb();

    const upsert = db.prepare(
      `INSERT INTO health_data (id, user_id, type, data, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
    );

    // Run as a single transaction for speed (1000+ items in <50ms).
    const tx = db.transaction(() => {
      for (const item of items) {
        upsert.run(item.id, user.id, item.type, JSON.stringify(item.data));
      }
    });
    tx();

    return NextResponse.json({
      synced: items.length,
      message: `${items.length} items synced`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Health Data Sync]', error?.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

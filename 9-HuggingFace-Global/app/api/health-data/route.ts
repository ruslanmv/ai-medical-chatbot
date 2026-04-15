import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, genId } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { encodeHealthPayload, decodeHealthPayload } from '@/lib/health-data-repo';

/**
 * GET  /api/health-data          → fetch all health data for the user
 * GET  /api/health-data?type=vital → filter by type
 * POST /api/health-data/sync     → bulk sync from client localStorage
 */
export async function GET(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const url = new URL(req.url);
  const type = url.searchParams.get('type');

  const rows = type
    ? db
        .prepare('SELECT * FROM health_data WHERE user_id = ? AND type = ? ORDER BY updated_at DESC')
        .all(user.id, type)
    : db
        .prepare('SELECT * FROM health_data WHERE user_id = ? ORDER BY updated_at DESC')
        .all(user.id);

  // Decrypt (or pass through legacy plaintext) the `data` field for each row.
  const items = (rows as any[]).map((r) => ({
    id: r.id,
    type: r.type,
    data: decodeHealthPayload(r.data),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/health-data — upsert a single health-data record.
 */
const UpsertSchema = z.object({
  id: z.string().optional(),
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

export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, type, data } = UpsertSchema.parse(body);

    const db = getDb();
    const itemId = id || genId();
    const payload = encodeHealthPayload(data);

    // Upsert: insert or replace. SQLite's ON CONFLICT handles this cleanly.
    db.prepare(
      `INSERT INTO health_data (id, user_id, type, data, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
    ).run(itemId, user.id, type, payload);

    return NextResponse.json({ id: itemId, type }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Health Data POST]', error?.message);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/health-data?id=<id> — delete one record.
 */
export async function DELETE(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM health_data WHERE id = ? AND user_id = ?').run(
    id,
    user.id,
  );

  return NextResponse.json({ success: true });
}

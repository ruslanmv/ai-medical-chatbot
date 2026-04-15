import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, genId } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { encodeHealthPayload } from '@/lib/health-data-repo';

/**
 * GET  /api/chat-history           → list conversations (newest first, max 100)
 * POST /api/chat-history           → save a conversation
 * DELETE /api/chat-history?id=<id> → delete one conversation
 */

export async function GET(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare(
      'SELECT id, preview, topic, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    )
    .all(user.id) as any[];

  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      preview: r.preview,
      topic: r.topic,
      createdAt: r.created_at,
    })),
  });
}

const SaveSchema = z.object({
  preview: z.string().max(200),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  topic: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const user = authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { preview, messages, topic } = SaveSchema.parse(body);

    const db = getDb();
    const id = genId();

    // Messages may contain PHI — encrypt at rest. The preview is intentionally
    // left in plaintext because it's displayed in the sidebar listing and is
    // already capped at 200 chars by the input schema.
    db.prepare(
      'INSERT INTO chat_history (id, user_id, preview, messages, topic) VALUES (?, ?, ?, ?, ?)',
    ).run(id, user.id, preview, encodeHealthPayload(messages), topic || null);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Chat History POST]', error?.message);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

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
  db.prepare('DELETE FROM chat_history WHERE id = ? AND user_id = ?').run(
    id,
    user.id,
  );

  return NextResponse.json({ success: true });
}

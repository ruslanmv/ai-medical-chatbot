/**
 * POST /api/admin/ingest — (re)build the RAG corpus on the Space.
 *
 * This is the practical in-Space trigger: it writes chunks + embeddings +
 * FTS into the SAME persistent /data/medos.db the running server reads, so
 * retrieval goes live without a redeploy.
 *
 * Auth: a shared secret in the `x-ingest-secret` header must equal the
 * `INGEST_SECRET` env var. If `INGEST_SECRET` is unset, the endpoint is
 * disabled (returns 403) — ingestion is an operator action, never public.
 *
 * Embedding the corpus can take a while; the Space request timeout applies.
 * For a large corpus, run scripts/ingest-corpus.ts offline against a
 * mounted /data volume instead.
 */

import { NextRequest } from 'next/server';
import { ingestCorpus } from '@/lib/rag/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function forbidden(): Response {
  return new Response(JSON.stringify({ error: 'forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.INGEST_SECRET;
  if (!secret || req.headers.get('x-ingest-secret') !== secret) {
    return forbidden();
  }

  const startedAt = Date.now();
  try {
    const result = await ingestCorpus();
    console.log(
      `[admin.ingest] ok ${JSON.stringify({ ...result, ms: Date.now() - startedAt })}`,
    );
    return new Response(
      JSON.stringify({ ok: true, ...result, ms: Date.now() - startedAt }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error(`[admin.ingest] failed: ${e?.message || e}`);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// Bare GET returns a tiny status (does NOT trigger ingestion).
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({ ok: true, hint: 'POST with x-ingest-secret to ingest' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

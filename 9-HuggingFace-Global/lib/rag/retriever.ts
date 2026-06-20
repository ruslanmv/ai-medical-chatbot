/**
 * Hybrid retrieval: SQLite FTS5 (keyword/BM25) + vector cosine, fused with
 * Reciprocal Rank Fusion. Everything lives in /data/medos.db, so there is
 * no external vector service to operate for the HF-Spaces (Tier A) target.
 *
 * Degradation ladder (never throws to the caller):
 *   both → keyword-only (no embeddings/token) → vector-only (no FTS5)
 *   → empty (corpus not ingested) → caller falls back to the keyword KB.
 */

import { getDb } from '../db';
import { embedQuery } from './embeddings';
import { deserializeEmbedding, cosineSimilarity } from './vectors';
import { buildFtsMatch } from './query';
import { rrfFuse } from './fusion';
import type { RetrievedChunk } from './types';

const CANDIDATES = 24; // per-modality candidate pool before fusion

// ── corpus state ─────────────────────────────────────────────────────

export function getActiveCorpusVersion(): string | null {
  try {
    const row = getDb()
      .prepare(
        `SELECT corpus_version FROM rag_corpus_manifest
         WHERE is_active = 1 ORDER BY built_at DESC LIMIT 1`,
      )
      .get() as { corpus_version: string } | undefined;
    return row?.corpus_version ?? null;
  } catch {
    return null;
  }
}

export function isCorpusReady(): boolean {
  const v = getActiveCorpusVersion();
  if (!v) return false;
  try {
    const row = getDb()
      .prepare(`SELECT COUNT(*) AS n FROM rag_chunks WHERE corpus_version = ?`)
      .get(v) as { n: number };
    return row.n > 0;
  } catch {
    return false;
  }
}

let _ftsAvailable: boolean | null = null;
function ftsAvailable(): boolean {
  if (_ftsAvailable !== null) return _ftsAvailable;
  try {
    const row = getDb()
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='rag_chunks_fts'`,
      )
      .get() as { name: string } | undefined;
    _ftsAvailable = !!row;
  } catch {
    _ftsAvailable = false;
  }
  return _ftsAvailable;
}

// ── in-memory vector cache (avoids re-reading BLOBs every request) ────

let _vecCache: { version: string; vecs: Array<{ id: string; v: Float32Array }> } | null =
  null;

/** Invalidate the cached vectors (call after re-ingesting a corpus). */
export function clearVectorCache(): void {
  _vecCache = null;
}

function loadVectors(version: string): Array<{ id: string; v: Float32Array }> {
  if (_vecCache && _vecCache.version === version) return _vecCache.vecs;
  const rows = getDb()
    .prepare(
      `SELECT chunk_id, embedding FROM rag_chunks
       WHERE corpus_version = ? AND embedding IS NOT NULL`,
    )
    .all(version) as Array<{ chunk_id: string; embedding: Buffer }>;
  const vecs = rows.map((r) => ({
    id: r.chunk_id,
    v: deserializeEmbedding(r.embedding),
  }));
  _vecCache = { version, vecs };
  return vecs;
}

// ── retrieval ────────────────────────────────────────────────────────

function keywordRanks(query: string, version: string): string[] {
  if (!ftsAvailable()) return [];
  const match = buildFtsMatch(query);
  if (!match) return [];
  try {
    const rows = getDb()
      .prepare(
        `SELECT f.chunk_id AS id
         FROM rag_chunks_fts f
         JOIN rag_chunks c ON c.chunk_id = f.chunk_id
         WHERE f.rag_chunks_fts MATCH ? AND c.corpus_version = ?
         ORDER BY bm25(f.rag_chunks_fts) ASC
         LIMIT ?`,
      )
      .all(match, version, CANDIDATES) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  } catch (e) {
    console.warn(`[rag.kw] FTS query failed: ${(e as Error).message}`);
    return [];
  }
}

async function vectorRanks(
  query: string,
  version: string,
): Promise<{ ids: string[]; sims: Map<string, number> }> {
  const qv = await embedQuery(query);
  if (!qv) return { ids: [], sims: new Map() };
  const vecs = loadVectors(version);
  const scored = vecs
    .map((x) => ({ id: x.id, sim: cosineSimilarity(qv, x.v) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, CANDIDATES);
  return {
    ids: scored.map((s) => s.id),
    sims: new Map(scored.map((s) => [s.id, s.sim])),
  };
}

/**
 * Retrieve the top-k chunks for a query via hybrid keyword + vector search.
 * Returns [] when the corpus is empty or both modalities are unavailable.
 */
export async function hybridSearch(
  query: string,
  topK = 6,
): Promise<RetrievedChunk[]> {
  const version = getActiveCorpusVersion();
  if (!version) return [];

  const kwIds = keywordRanks(query, version);
  const { ids: vecIds, sims } = await vectorRanks(query, version);
  if (kwIds.length === 0 && vecIds.length === 0) return [];

  // Per-modality rank maps (diagnostics) + RRF-fused ordering.
  const kwRank = new Map(kwIds.map((id, i) => [id, i + 1] as const));
  const vecRank = new Map(vecIds.map((id, i) => [id, i + 1] as const));
  const fused = rrfFuse([kwIds, vecIds]);
  const fusedScore = new Map(fused.map((f) => [f.id, f.score]));

  const topIds = fused.slice(0, topK).map((f) => f.id);
  if (topIds.length === 0) return [];

  // Hydrate full metadata for the winners.
  const placeholders = topIds.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT chunk_id, doc_title, organization, url, version_date, lang,
              topic, text, corpus_version
       FROM rag_chunks WHERE chunk_id IN (${placeholders})`,
    )
    .all(...topIds) as Array<Omit<RetrievedChunk, 'score' | 'vectorSim' | 'keywordRank' | 'vectorRank'>>;
  const byId = new Map(rows.map((r) => [r.chunk_id, r]));

  return topIds
    .map((id): RetrievedChunk | null => {
      const meta = byId.get(id);
      if (!meta) return null;
      return {
        ...meta,
        score: fusedScore.get(id) || 0,
        vectorSim: sims.has(id) ? sims.get(id)! : null,
        keywordRank: kwRank.get(id),
        vectorRank: vecRank.get(id),
      };
    })
    .filter((c): c is RetrievedChunk => c !== null);
}

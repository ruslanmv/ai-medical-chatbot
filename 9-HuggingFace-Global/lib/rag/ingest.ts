/**
 * Corpus ingestion (Phase 1, offline/admin step).
 *
 * Reads source-attributed documents from `data/corpus/*.jsonl`, splits long
 * text into passages, embeds each passage (HF Inference), and writes the
 * chunks + FTS index + a corpus manifest into /data/medos.db. Re-runnable:
 * a version is fully replaced on re-ingest, and exactly one version is
 * marked active.
 *
 * Trigger it via `scripts/ingest-corpus.ts` (offline) or
 * `POST /api/admin/ingest` (in-Space). Embedding is async, so we embed
 * first, then write inside a single synchronous SQLite transaction.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getDb } from '../db';
import { embedPassage, serializeEmbedding, embeddingModel } from './embeddings';
import { clearVectorCache } from './retriever';

interface SourceDoc {
  chunk_id?: string;
  doc_title: string;
  organization: string;
  url?: string;
  version_date?: string;
  lang?: string;
  topic?: string;
  text: string;
}

interface PreparedChunk extends Required<Omit<SourceDoc, 'chunk_id'>> {
  chunk_id: string;
}

export interface IngestResult {
  corpus_version: string;
  chunk_count: number;
  embedded: number;
  embed_model: string;
  sources: Array<{ organization: string; url: string; version_date: string }>;
}

function corpusDir(): string {
  return process.env.CORPUS_DIR || join(process.cwd(), 'data', 'corpus');
}

function corpusVersion(): string {
  if (process.env.CORPUS_VERSION) return process.env.CORPUS_VERSION;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}.${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

/** Split long text into ~1200-char passages on sentence boundaries. */
function splitPassages(text: string, max = 1200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S+$/g) || [clean];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).trim().length > max && buf) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = (buf + ' ' + s).trim();
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}

function loadSourceDocs(): SourceDoc[] {
  const dir = corpusDir();
  if (!existsSync(dir)) {
    throw new Error(`Corpus directory not found: ${dir}`);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl') || f.endsWith('.json'));
  const docs: SourceDoc[] = [];
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    if (f.endsWith('.jsonl')) {
      for (const line of raw.split('\n')) {
        const t = line.trim();
        if (t) docs.push(JSON.parse(t));
      }
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) docs.push(...parsed);
    }
  }
  return docs.filter((d) => d && d.text && d.doc_title && d.organization);
}

function prepare(docs: SourceDoc[], version: string): PreparedChunk[] {
  const chunks: PreparedChunk[] = [];
  for (const d of docs) {
    const passages = splitPassages(d.text);
    passages.forEach((text, i) => {
      const base = d.chunk_id || `${slug(d.organization)}_${slug(d.doc_title)}`;
      const chunk_id = passages.length > 1 ? `${base}_${i}` : base;
      chunks.push({
        chunk_id,
        doc_title: d.doc_title,
        organization: d.organization,
        url: d.url || '',
        version_date: d.version_date || '',
        lang: d.lang || 'en',
        topic: d.topic || '',
        text,
      });
    });
  }
  return chunks;
}

export async function ingestCorpus(): Promise<IngestResult> {
  const version = corpusVersion();
  const model = embeddingModel();
  const docs = loadSourceDocs();
  const chunks = prepare(docs, version);
  if (chunks.length === 0) throw new Error('No usable corpus documents found.');

  // Embed first (async, network) — outside any SQLite transaction.
  const embeddings: Array<Buffer | null> = [];
  let embedded = 0;
  for (const c of chunks) {
    const vec = await embedPassage(c.text);
    if (vec) {
      embeddings.push(serializeEmbedding(vec));
      embedded++;
    } else {
      embeddings.push(null); // keyword-only fallback for this chunk
    }
  }

  const db = getDb();
  const ftsExists = !!db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='rag_chunks_fts'`)
    .get();

  const sourceMap = new Map<string, { organization: string; url: string; version_date: string }>();
  for (const c of chunks) {
    sourceMap.set(`${c.organization}|${c.url}`, {
      organization: c.organization,
      url: c.url,
      version_date: c.version_date,
    });
  }
  const sources = Array.from(sourceMap.values());

  const write = db.transaction(() => {
    // Replace any existing rows for this version (idempotent re-ingest).
    if (ftsExists) {
      db.prepare(
        `DELETE FROM rag_chunks_fts WHERE chunk_id IN
         (SELECT chunk_id FROM rag_chunks WHERE corpus_version = ?)`,
      ).run(version);
    }
    db.prepare(`DELETE FROM rag_chunks WHERE corpus_version = ?`).run(version);

    const insChunk = db.prepare(
      `INSERT INTO rag_chunks
         (chunk_id, doc_title, organization, url, version_date, lang, topic, text, embedding, corpus_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insFts = ftsExists
      ? db.prepare(`INSERT INTO rag_chunks_fts (chunk_id, text) VALUES (?, ?)`)
      : null;

    chunks.forEach((c, i) => {
      insChunk.run(
        c.chunk_id, c.doc_title, c.organization, c.url, c.version_date,
        c.lang, c.topic, c.text, embeddings[i], version,
      );
      insFts?.run(c.chunk_id, c.text);
    });

    // Activate this version, deactivate the rest.
    db.prepare(`UPDATE rag_corpus_manifest SET is_active = 0`).run();
    db.prepare(
      `INSERT INTO rag_corpus_manifest (corpus_version, embed_model, sources_json, chunk_count, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(corpus_version) DO UPDATE SET
         embed_model=excluded.embed_model, sources_json=excluded.sources_json,
         chunk_count=excluded.chunk_count, is_active=1, built_at=datetime('now')`,
    ).run(version, model, JSON.stringify(sources), chunks.length);
  });
  write();

  clearVectorCache();

  return {
    corpus_version: version,
    chunk_count: chunks.length,
    embedded,
    embed_model: model,
    sources,
  };
}

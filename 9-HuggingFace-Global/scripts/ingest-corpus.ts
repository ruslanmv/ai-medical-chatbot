/**
 * Offline corpus ingestion CLI (Phase 1).
 *
 * Reads data/corpus/*.jsonl, embeds each passage, and writes the chunks +
 * FTS index + manifest into the SQLite DB at $DB_PATH.
 *
 * Run from 9-HuggingFace-Global/ (tsx executes TypeScript directly):
 *
 *   DB_PATH=./medos.dev.db HF_TOKEN_INFERENCE=hf_xxx \
 *     npx tsx scripts/ingest-corpus.ts
 *
 * On the Space itself, prefer POST /api/admin/ingest (see
 * app/api/admin/ingest/route.ts) so the index is written to the same
 * persistent /data/medos.db the running server uses.
 *
 * Env:
 *   DB_PATH               SQLite path (default /data/medos.db)
 *   HF_TOKEN_INFERENCE    or HF_TOKEN — needed for embeddings
 *   RAG_EMBED_MODEL       embedding model (default multilingual-e5-base)
 *   CORPUS_DIR            corpus dir (default ./data/corpus)
 *   CORPUS_VERSION        explicit version label (default UTC datestamp)
 */

import { ingestCorpus } from '../lib/rag/ingest';

ingestCorpus()
  .then((r) => {
    console.log('[ingest] complete:', JSON.stringify(r, null, 2));
    if (r.embedded < r.chunk_count) {
      console.warn(
        `[ingest] WARNING: ${r.chunk_count - r.embedded}/${r.chunk_count} chunks have NO embedding ` +
          `(missing/failed HF token?). Vector search will be partial; keyword search still works.`,
      );
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error('[ingest] FAILED:', e);
    process.exit(1);
  });

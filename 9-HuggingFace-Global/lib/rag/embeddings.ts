/**
 * Embeddings for the grounded RAG pipeline.
 *
 * Document embeddings are computed once at ingest time and stored as a
 * float32 BLOB in rag_chunks. At request time we embed only the QUERY
 * (one remote call, cached) so per-turn latency stays inside the proxy's
 * timeout budget.
 *
 * Provider: HuggingFace Inference feature-extraction. The Space ships no
 * local ML stack, so embeddings are always remote. If no token is present
 * or the API is unavailable, callers degrade to keyword-only retrieval.
 */

import { createHash } from 'crypto';
import { getDb } from '../db';
import { serializeEmbedding, deserializeEmbedding } from './vectors';

const DEFAULT_MODEL = 'intfloat/multilingual-e5-base'; // 768-dim, 100+ langs
const TIMEOUT_MS = 12_000;

export function embeddingModel(): string {
  return process.env.RAG_EMBED_MODEL || DEFAULT_MODEL;
}

function token(): string | undefined {
  // Prefer the dedicated inference token, fall back to the general one.
  return process.env.HF_TOKEN_INFERENCE || process.env.HF_TOKEN || undefined;
}

/** e5 models expect "query: " / "passage: " prefixes; other models don't. */
function withPrefix(text: string, kind: 'query' | 'passage'): string {
  return /e5/i.test(embeddingModel()) ? `${kind}: ${text}` : text;
}

// Pure vector helpers live in ./vectors (unit-tested). Re-exported here so
// existing importers (`from './embeddings'`) keep working unchanged.
export {
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
} from './vectors';

// ── HF Inference feature-extraction ──────────────────────────────────

/**
 * Normalise the various shapes HF feature-extraction can return into a
 * single sentence vector:
 *   - number[]        → use as-is (sentence-transformer pooled output)
 *   - number[][]      → mean-pool over tokens
 *   - number[][][]    → take first batch item, then mean-pool
 */
function toVector(raw: unknown): Float32Array | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  let arr = raw as any;
  if (Array.isArray(arr[0]) && Array.isArray(arr[0][0])) arr = arr[0]; // unbatch
  if (typeof arr[0] === 'number') {
    return Float32Array.from(arr as number[]);
  }
  if (Array.isArray(arr[0]) && typeof arr[0][0] === 'number') {
    const tokens = arr as number[][];
    const dim = tokens[0].length;
    const out = new Float32Array(dim);
    for (const t of tokens) for (let i = 0; i < dim; i++) out[i] += t[i];
    for (let i = 0; i < dim; i++) out[i] /= tokens.length;
    return out;
  }
  return null;
}

async function embed(text: string): Promise<Float32Array | null> {
  const tok = token();
  if (!tok) return null;
  const model = embeddingModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tok}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          // Wait through cold model loads rather than failing the turn.
          options: { wait_for_model: true },
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.warn(`[rag.embed] HF ${res.status} for ${model}`);
      return null;
    }
    return toVector(await res.json());
  } catch (e) {
    console.warn(`[rag.embed] failed: ${(e as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Embed a passage (ingest time). Never cached — done once per chunk. */
export function embedPassage(text: string): Promise<Float32Array | null> {
  return embed(withPrefix(text, 'passage'));
}

/** Embed a query (request time) with a small DB-backed cache. */
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const model = embeddingModel();
  const qhash = createHash('sha256').update(`${model}:${text}`).digest('hex');

  try {
    const row = getDb()
      .prepare(`SELECT embedding FROM rag_embed_cache WHERE qhash = ?`)
      .get(qhash) as { embedding: Buffer } | undefined;
    if (row?.embedding) return deserializeEmbedding(row.embedding);
  } catch {
    // cache read is best-effort
  }

  const vec = await embed(withPrefix(text, 'query'));
  if (!vec) return null;

  try {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO rag_embed_cache (qhash, embedding, model) VALUES (?, ?, ?)`,
      )
      .run(qhash, serializeEmbedding(vec), model);
  } catch {
    // cache write is best-effort
  }
  return vec;
}

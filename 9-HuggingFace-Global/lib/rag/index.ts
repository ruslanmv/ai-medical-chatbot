/**
 * RAG orchestrator — the single entry point the chat route calls.
 *
 *   normalize → (corpus ready?) → hybridSearch → (enough evidence?) →
 *   grounded context | insufficient | kb-fallback
 *
 * The route decides what to DO with each mode (ground the prompt, defer,
 * or fall back to the keyword KB); this module only retrieves and grades.
 */

import { normalizeQuery } from './query';
import { hybridSearch, isCorpusReady, getActiveCorpusVersion } from './retriever';
import { buildGroundedContext } from './context';
import type { GroundedRetrieval, RetrievedChunk } from './types';

function topK(): number {
  const n = parseInt(process.env.RAG_TOPK || '6', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 6;
}

/**
 * Minimum cosine similarity for the best chunk to count as real evidence.
 * Tuned for e5-style models (relevant passages typically score > 0.75).
 * When keyword-only retrieval is in play (no embeddings) we cannot apply a
 * cosine floor, so a keyword hit is accepted as evidence.
 */
function minSim(): number {
  const n = parseFloat(process.env.RAG_MIN_SIM || '0.72');
  return Number.isFinite(n) ? n : 0.72;
}

export async function retrieveAndGround(query: string): Promise<GroundedRetrieval> {
  const empty: GroundedRetrieval = {
    mode: 'kb-fallback',
    contextText: '',
    sources: [],
    chunks: [],
    hasEvidence: false,
    bestSim: null,
    corpusVersion: null,
  };

  const q = normalizeQuery(query);
  if (!q || !isCorpusReady()) return empty;

  const corpusVersion = getActiveCorpusVersion();

  let chunks: RetrievedChunk[];
  try {
    chunks = await hybridSearch(q, topK());
  } catch (e) {
    console.warn(`[rag] hybridSearch failed, falling back to KB: ${(e as Error).message}`);
    return { ...empty, corpusVersion };
  }

  if (chunks.length === 0) {
    // Corpus is ready but nothing matched → genuine "insufficient".
    return { ...empty, mode: 'insufficient', corpusVersion };
  }

  const sims = chunks
    .map((c) => c.vectorSim)
    .filter((s): s is number => s !== null);
  const bestSim = sims.length ? Math.max(...sims) : null;

  // Vector evidence must clear the similarity floor. If we only have
  // keyword evidence (no embeddings available), accept the keyword hit.
  const hasEvidence = bestSim === null ? true : bestSim >= minSim();

  if (!hasEvidence) {
    return { ...empty, mode: 'insufficient', chunks, bestSim, corpusVersion };
  }

  const { contextText, sources } = buildGroundedContext(chunks);
  return {
    mode: 'grounded',
    contextText,
    sources,
    chunks,
    hasEvidence: true,
    bestSim,
    corpusVersion,
  };
}

/**
 * Shared types for the grounded hybrid RAG pipeline.
 *
 * The retrieval unit is a "chunk": a passage of authoritative text with
 * full source provenance. Everything downstream (context building,
 * faithfulness checks, the evidence receipt) is keyed on these.
 */

/** A stored, source-attributed passage. Mirrors the rag_chunks table. */
export interface CorpusChunk {
  chunk_id: string;
  doc_title: string;
  organization: string;
  url: string;
  version_date: string;
  lang: string;
  topic: string;
  text: string;
  corpus_version: string;
}

/** A chunk returned by retrieval, with fusion + similarity diagnostics. */
export interface RetrievedChunk extends CorpusChunk {
  /** Fused Reciprocal-Rank-Fusion score (higher = more relevant). */
  score: number;
  /** Raw cosine similarity to the query embedding, or null if vector
   *  search was unavailable (keyword-only retrieval). */
  vectorSim: number | null;
  /** 1-based rank in the keyword list, if it matched there. */
  keywordRank?: number;
  /** 1-based rank in the vector list, if it matched there. */
  vectorRank?: number;
}

/** A citation surfaced to the user / persisted in the evidence receipt. */
export interface EvidenceSource {
  /** Inline reference label, e.g. "S1". */
  ref: string;
  title: string;
  organization: string;
  url: string;
  version_date: string;
  chunk_id: string;
  score: number;
}

export type RagMode =
  | 'grounded' // evidence retrieved; answer must be grounded in it
  | 'insufficient' // corpus ready but nothing relevant found
  | 'kb-fallback' // corpus not ready / retrieval failed → keyword KB
  | 'disabled'; // RAG_HYBRID flag off

/** Result of the retrieve-and-ground step handed to the chat route. */
export interface GroundedRetrieval {
  mode: RagMode;
  /** Prompt-ready, source-labelled context block ("" when no evidence). */
  contextText: string;
  sources: EvidenceSource[];
  chunks: RetrievedChunk[];
  /** True only when `mode === 'grounded'`. */
  hasEvidence: boolean;
  /** Best cosine similarity among retrieved chunks (diagnostics). */
  bestSim: number | null;
  /** Active corpus snapshot the answer is grounded against. */
  corpusVersion: string | null;
}

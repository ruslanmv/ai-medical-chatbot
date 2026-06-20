/**
 * Query preprocessing for retrieval.
 *
 *  - normalizeQuery: trim, collapse whitespace, cap length.
 *  - buildFtsMatch:  turn free user text into a SAFE FTS5 MATCH expression.
 *    Passing raw user input to FTS5 MATCH throws on punctuation/operators
 *    ("?", "-", quotes, AND/OR/NEAR), so we tokenise, drop noise, quote
 *    each term, and OR them together.
 *
 * Kept deterministic and dependency-free. An optional LLM-based rewrite
 * can be layered on later behind its own flag; it is intentionally not in
 * the hot path here (one fewer model call per turn).
 */

const MAX_LEN = 500;

// Small, language-agnostic-ish stop list. Retrieval is robust to a few
// extra terms, so this only needs to drop the highest-frequency noise.
const STOP = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'have',
  'has', 'had', 'this', 'that', 'what', 'why', 'how', 'when', 'who', 'can',
  'could', 'would', 'should', 'about', 'from', 'into', 'than', 'then',
  'them', 'they', 'there', 'here', 'been', 'was', 'were', 'will', 'just',
  'get', 'got', 'feel', 'feeling', 'please', 'help', 'tell', 'know',
]);

export function normalizeQuery(raw: string): string {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
}

/** Extract content tokens (lowercased, >=3 chars, non-stopword). */
export function queryTerms(query: string): string[] {
  const terms = (query.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((t) => t.length >= 3 && !STOP.has(t));
  return Array.from(new Set(terms)).slice(0, 24);
}

/**
 * Build a safe FTS5 MATCH string, e.g. `"chest" OR "pain" OR "breath"`.
 * Returns '' when there are no usable terms (caller then skips keyword
 * search and relies on vector similarity).
 */
export function buildFtsMatch(query: string): string {
  const terms = queryTerms(query);
  if (terms.length === 0) return '';
  return terms.map((t) => `"${t}"`).join(' OR ');
}

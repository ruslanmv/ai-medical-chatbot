/**
 * Reciprocal Rank Fusion (RRF).
 *
 * Combines several ranked id lists (e.g. keyword + vector) into one ranking
 * without needing comparable raw scores: each list contributes
 * 1 / (k + rank) to an id's fused score. Standard k = 60.
 *
 * Pure and dependency-free so it is unit-testable in isolation.
 */

export const RRF_K = 60;

export function rrfFuse(
  lists: string[][],
  k: number = RRF_K,
): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => {
      scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1));
    });
  }
  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

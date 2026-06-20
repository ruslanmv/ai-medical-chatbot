/**
 * Parse the faithfulness judge's reply into a structured verdict.
 *
 * Robust to models that wrap JSON in prose or code fences: we extract the
 * first {...} block, clamp groundedness to [0,1], and tolerate a missing
 * or malformed unsupported_claims array. Returns null when no usable JSON
 * is present (caller then fails open). Pure — unit-testable on its own.
 */

export function parseJudge(
  text: string,
): { groundedness: number; unsupported: string[] } | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    const g = Number(o.groundedness);
    if (!Number.isFinite(g)) return null;
    const unsupported = Array.isArray(o.unsupported_claims)
      ? o.unsupported_claims.map((x: unknown) => String(x)).slice(0, 10)
      : [];
    return { groundedness: Math.max(0, Math.min(1, g)), unsupported };
  } catch {
    return null;
  }
}

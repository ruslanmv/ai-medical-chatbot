/**
 * Pure vector helpers: float32 <-> SQLite BLOB and cosine similarity.
 *
 * No DB or network imports, so this is safe to unit-test directly and to
 * import from anywhere. (de)serialization is endian- and alignment-safe so
 * a vector survives a round trip through better-sqlite3.
 */

export function serializeEmbedding(v: Float32Array): Buffer {
  const buf = Buffer.allocUnsafe(v.length * 4);
  for (let i = 0; i < v.length; i++) buf.writeFloatLE(v[i], i * 4);
  return buf;
}

export function deserializeEmbedding(buf: Buffer): Float32Array {
  const n = Math.floor(buf.byteLength / 4);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

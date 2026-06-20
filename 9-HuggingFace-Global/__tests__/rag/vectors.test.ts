import { describe, it, expect } from 'vitest';
import {
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
} from '@/lib/rag/vectors';

describe('embedding (de)serialization', () => {
  it('round-trips a vector through a Buffer', () => {
    const v = Float32Array.from([0.5, -1.25, 3.0, 0, 0.123]);
    const back = deserializeEmbedding(serializeEmbedding(v));
    expect(back.length).toBe(v.length);
    for (let i = 0; i < v.length; i++) {
      expect(back[i]).toBeCloseTo(v[i], 5);
    }
  });

  it('produces 4 bytes per float', () => {
    const v = Float32Array.from([1, 2, 3]);
    expect(serializeEmbedding(v).byteLength).toBe(12);
  });

  it('handles an empty vector', () => {
    const back = deserializeEmbedding(serializeEmbedding(new Float32Array(0)));
    expect(back.length).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    const v = Float32Array.from([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(
      cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 1])),
    ).toBeCloseTo(0, 6);
  });

  it('is -1 for opposite vectors', () => {
    expect(
      cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([-1, 0])),
    ).toBeCloseTo(-1, 6);
  });

  it('returns 0 on length mismatch or empty input', () => {
    expect(
      cosineSimilarity(Float32Array.from([1, 2]), Float32Array.from([1, 2, 3])),
    ).toBe(0);
    expect(cosineSimilarity(new Float32Array(0), new Float32Array(0))).toBe(0);
  });
});

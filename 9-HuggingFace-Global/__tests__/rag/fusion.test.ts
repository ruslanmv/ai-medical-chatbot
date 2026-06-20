import { describe, it, expect } from 'vitest';
import { rrfFuse, RRF_K } from '@/lib/rag/fusion';

describe('rrfFuse', () => {
  it('ranks a single list by position', () => {
    const out = rrfFuse([['a', 'b', 'c']]);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  it('rewards items that appear in multiple lists', () => {
    // "b" is mid-rank in both lists; "a" and "x" each appear in only one.
    const out = rrfFuse([
      ['a', 'b', 'c'],
      ['x', 'b', 'y'],
    ]);
    const top = out[0].id;
    expect(top).toBe('b'); // present in both → highest fused score
  });

  it('sums reciprocal ranks with the RRF constant', () => {
    const out = rrfFuse([['a'], ['a']]);
    // a is rank 1 in both lists → 2 * 1/(k+1)
    expect(out[0].id).toBe('a');
    expect(out[0].score).toBeCloseTo(2 / (RRF_K + 1), 10);
  });

  it('honours a custom k', () => {
    const small = rrfFuse([['a', 'b']], 1);
    const big = rrfFuse([['a', 'b']], 1000);
    // Smaller k spreads scores more; larger k compresses them.
    const spreadSmall = small[0].score - small[1].score;
    const spreadBig = big[0].score - big[1].score;
    expect(spreadSmall).toBeGreaterThan(spreadBig);
  });

  it('returns [] for empty input', () => {
    expect(rrfFuse([])).toEqual([]);
    expect(rrfFuse([[], []])).toEqual([]);
  });

  it('output is sorted descending by score', () => {
    const out = rrfFuse([['a', 'b', 'c', 'd']]);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });
});

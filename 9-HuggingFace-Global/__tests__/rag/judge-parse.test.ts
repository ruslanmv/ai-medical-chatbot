import { describe, it, expect } from 'vitest';
import { parseJudge } from '@/lib/rag/judge-parse';

describe('parseJudge', () => {
  it('parses clean JSON', () => {
    const r = parseJudge('{"groundedness": 0.9, "unsupported_claims": ["x"]}');
    expect(r).toEqual({ groundedness: 0.9, unsupported: ['x'] });
  });

  it('extracts JSON embedded in prose / code fences', () => {
    const r = parseJudge(
      'Sure! Here is my verdict:\n```json\n{"groundedness": 0.5, "unsupported_claims": []}\n```\nHope that helps.',
    );
    expect(r?.groundedness).toBe(0.5);
    expect(r?.unsupported).toEqual([]);
  });

  it('clamps groundedness into [0,1]', () => {
    expect(parseJudge('{"groundedness": 1.7}')?.groundedness).toBe(1);
    expect(parseJudge('{"groundedness": -0.3}')?.groundedness).toBe(0);
  });

  it('coerces unsupported_claims to strings and caps at 10', () => {
    const claims = Array.from({ length: 15 }, (_, i) => i);
    const r = parseJudge(
      `{"groundedness": 0.4, "unsupported_claims": ${JSON.stringify(claims)}}`,
    );
    expect(r?.unsupported).toHaveLength(10);
    expect(r?.unsupported[0]).toBe('0');
  });

  it('defaults unsupported_claims to [] when missing or wrong type', () => {
    expect(parseJudge('{"groundedness": 0.8}')?.unsupported).toEqual([]);
    expect(
      parseJudge('{"groundedness": 0.8, "unsupported_claims": "nope"}')?.unsupported,
    ).toEqual([]);
  });

  it('returns null for non-finite score, no JSON, or empty input', () => {
    expect(parseJudge('{"groundedness": "high"}')).toBeNull();
    expect(parseJudge('no json here')).toBeNull();
    expect(parseJudge('')).toBeNull();
  });
});

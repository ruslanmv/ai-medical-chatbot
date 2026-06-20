import { describe, it, expect } from 'vitest';
import { normalizeQuery, queryTerms, buildFtsMatch } from '@/lib/rag/query';

describe('normalizeQuery', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeQuery('  chest   pain\n\there ')).toBe('chest pain here');
  });

  it('caps length at 500 chars', () => {
    expect(normalizeQuery('a'.repeat(900)).length).toBe(500);
  });

  it('handles empty / nullish input', () => {
    expect(normalizeQuery('')).toBe('');
    // @ts-expect-error — defensive: tolerate undefined at runtime
    expect(normalizeQuery(undefined)).toBe('');
  });
});

describe('queryTerms', () => {
  it('drops stopwords and short tokens, lowercases, dedupes', () => {
    const terms = queryTerms('What are the BEST best treatments for pain');
    expect(terms).toContain('best');
    expect(terms).toContain('treatments');
    expect(terms).toContain('pain');
    expect(terms).not.toContain('the'); // stopword
    expect(terms).not.toContain('for'); // stopword
    // de-duplicated
    expect(terms.filter((t) => t === 'best')).toHaveLength(1);
  });

  it('returns [] when nothing usable remains', () => {
    expect(queryTerms('the and a an ?? !!')).toEqual([]);
  });
});

describe('buildFtsMatch (FTS5 injection safety)', () => {
  it('produces only quoted terms joined by OR', () => {
    const m = buildFtsMatch('chest pain breathing');
    expect(m).toMatch(/^"[a-z0-9]+"( OR "[a-z0-9]+")*$/);
    expect(m).toContain('"chest"');
  });

  it('neutralises FTS operators and punctuation', () => {
    // Raw input that would throw or inject if passed to MATCH verbatim.
    const m = buildFtsMatch('x" OR rag_chunks_fts MATCH "y NEAR(z) -drop');
    // No unbalanced quotes; every quote belongs to a "token" wrapper.
    expect((m.match(/"/g) || []).length % 2).toBe(0);
    // Only quoted-alnum-OR structure survives — no bare operators/quotes.
    if (m) expect(m).toMatch(/^"[a-z0-9]+"( OR "[a-z0-9]+")*$/);
  });

  it('returns empty string when there are no usable terms', () => {
    expect(buildFtsMatch('?? a an')).toBe('');
  });
});

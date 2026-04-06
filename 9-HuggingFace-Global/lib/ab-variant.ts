/**
 * Deterministic client-side A/B variant picker.
 *
 * Assigns each visitor a stable variant on first load and persists it
 * in `localStorage` so the same visitor sees the same headline across
 * reloads and sessions — required for a meaningful A/B test.
 *
 * No server, no cookies, no PII: the variant is just one of `0..n-1`.
 * If localStorage is unavailable (SSR, privacy modes) the function
 * returns a time-seeded fallback so the UI still renders something
 * sensible.
 */

const STORAGE_KEY = 'medos_variant';

export function pickVariant(n: number): number {
  if (n <= 1) return 0;
  if (typeof window === 'undefined') return 0;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing !== null) {
      const parsed = parseInt(existing, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < n) return parsed;
    }
    const v = Math.floor(Math.random() * n);
    localStorage.setItem(STORAGE_KEY, String(v));
    return v;
  } catch {
    return Math.floor(Date.now() / 1000) % n;
  }
}

/**
 * Three candidate hero headlines we will A/B-test. Each variant is
 * stored alongside a short subtitle used in the empty-state copy.
 * Ordering is meaningful — variant 0 is the current control.
 */
export const HERO_VARIANTS = [
  {
    title: "Tell me what's bothering you.",
    subtitle:
      "I'll help you understand it — calmly, clearly, and privately. Aligned with WHO · CDC · NHS guidelines.",
    eyebrow: 'Your worldwide medical companion',
  },
  {
    title: 'Describe how you feel.',
    subtitle:
      'Get clear, trustworthy health guidance in your own language — instantly, for free, with no sign-up.',
    eyebrow: 'Trusted health answers, 24/7',
  },
  {
    title: 'Ask any health question.',
    subtitle:
      'Private, multilingual medical guidance aligned with WHO and CDC. No account, no paywall, no data stored.',
    eyebrow: 'Free forever · 20 languages',
  },
] as const;

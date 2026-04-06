/**
 * Client-side helpers for shareable, viral-friendly URLs.
 *
 * Every AI answer can be turned into a link of the form
 * `https://<host>/?q=<question>` that, when opened, pre-fills the hero
 * input and auto-sends. The same URL's OG image is generated dynamically
 * via `/api/og?q=...` so the link previews as a branded card on every
 * major social platform and messenger.
 */

/** Build a canonical share URL for a given question. */
export function buildShareUrl(question: string, lang?: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin);
  url.searchParams.set('q', question);
  if (lang) url.searchParams.set('lang', lang);
  return url.toString();
}

/** Build the dynamic OG preview URL for a given question. */
export function buildOgUrl(question: string, lang?: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL('/api/og', window.location.origin);
  if (question) url.searchParams.set('q', question);
  if (lang) url.searchParams.set('lang', lang);
  return url.toString();
}

/**
 * Share a message using the platform's native share sheet when available
 * (mobile), falling back to clipboard-copy on desktop. Returns true if
 * the share/copy succeeded.
 */
export async function shareMessage(
  question: string,
  lang?: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const url = buildShareUrl(question, lang);
  if (!url) return 'failed';

  const shareData: ShareData = {
    title: 'MedOS — free AI medical assistant',
    text: question,
    url,
  };

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      navigator.canShare?.(shareData) !== false
    ) {
      await navigator.share(shareData);
      return 'shared';
    }
  } catch {
    // User dismissed or share failed — fall through to clipboard.
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    // ignore
  }

  return 'failed';
}

/** Read an incoming `?q=` parameter on page load for prefill. */
export function readPrefillQuery(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  return q && q.trim().length > 0 ? q.trim().slice(0, 500) : null;
}

/**
 * Generic follow-up suggestions after an AI answer. Intentionally
 * language-neutral (uses symbols and short English phrases) — the model
 * itself will respond in the user's language once the chip is clicked.
 * Keeping them static is a deliberate choice: deterministic, zero parsing
 * risk, and always-relevant for the medical domain.
 */
export const FOLLOW_UP_PROMPTS = [
  'Tell me more',
  'What causes this?',
  'Should I see a doctor?',
  'How can I prevent it?',
] as const;

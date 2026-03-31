'use client';

/**
 * Anonymous session tracker.
 * Calls server-side /api/sessions to track real session count.
 * Zero PII — only increments a global counter per chat session.
 */

const SESSION_KEY = 'medos-session-tracked';

/**
 * Track a new session (called once per page load).
 * Returns the updated global count.
 */
export async function trackSession(): Promise<number> {
  // Only track once per browser session (sessionStorage resets on tab close)
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
    return fetchCount();
  }

  try {
    const response = await fetch('/api/sessions', { method: 'POST' });
    if (response.ok) {
      const data = await response.json();
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
      return data.count || 0;
    }
  } catch {
    // Offline or error — return cached
  }
  return 0;
}

/**
 * Fetch current count without incrementing.
 */
export async function fetchCount(): Promise<number> {
  try {
    const response = await fetch('/api/sessions', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch {
    // Offline
  }
  return 0;
}

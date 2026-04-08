/**
 * MedOS Rate Limiter — sliding-window in-memory rate limiting.
 *
 * Protects auth endpoints against brute-force attacks.
 * Uses IP-based tracking with configurable windows.
 *
 * Production note: For multi-instance deployments, replace
 * the in-memory Map with Redis (same interface).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Auto-prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check and increment rate limit for a given key.
 *
 * @param key       Unique identifier (e.g., IP + endpoint)
 * @param maxHits   Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns         { allowed: boolean, remaining: number, retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxHits: number = 10,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxHits - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxHits) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  // Increment
  entry.count++;
  return { allowed: true, remaining: maxHits - entry.count, retryAfterMs: 0 };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, nginx, and direct connections.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

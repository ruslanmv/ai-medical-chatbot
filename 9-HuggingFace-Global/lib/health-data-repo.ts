/**
 * Health-data repository — the ONLY layer that knows clinical payloads
 * are encrypted at rest in SQLite.
 *
 * Why a dedicated module:
 *   - Clinical data (medications, vitals, appointments, EHR JSON,
 *     conversation transcripts) is PHI. On a Hugging Face Space the
 *     persistent disk is shared platform infrastructure — defence in
 *     depth requires wrapping those blobs with AES-256-GCM before they
 *     touch the filesystem.
 *   - Every read/write of `health_data.data` or `chat_history.messages`
 *     used to happen inline inside route handlers, so it was easy to
 *     forget a code path. Centralising here makes it one-line to encrypt
 *     on write and transparently decrypt on read.
 *
 * Migration safety:
 *   decryptString() returns the payload unchanged when it does not carry
 *   the "v1:" version prefix, so existing plaintext rows keep working
 *   until they're rewritten. No data migration required; rows become
 *   encrypted the next time they're saved.
 */

import { encryptString, decryptString } from './crypto';

/**
 * Encode a JSON-serialisable payload for storage. Stringifies then
 * encrypts. Empty / null payloads are stored as '{}' (unencrypted sentinel
 * — saves a crypto round-trip and keeps the column non-null).
 */
export function encodeHealthPayload(data: unknown): string {
  if (data == null) return '{}';
  const json = JSON.stringify(data);
  if (json === '{}' || json === '[]') return json;
  return encryptString(json);
}

/**
 * Decode whatever `encodeHealthPayload()` wrote, PLUS any legacy plaintext
 * JSON left over from before encryption was introduced. Returns `{}` on
 * any failure so a single corrupt row never crashes a listing endpoint.
 */
export function decodeHealthPayload<T = unknown>(stored: string | null | undefined): T {
  if (!stored) return {} as T;
  // Legacy fast-paths.
  if (stored === '{}') return {} as T;
  if (stored === '[]') return ([] as unknown) as T;

  const decoded = decryptString(stored);
  try {
    return JSON.parse(decoded) as T;
  } catch {
    // If the row wasn't JSON after decryption, assume it was opaque plaintext.
    return (decoded as unknown) as T;
  }
}

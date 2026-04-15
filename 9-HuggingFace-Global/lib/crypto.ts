/**
 * MedOS at-rest encryption helpers.
 *
 * Used to wrap user-provided secrets (BYO Hugging Face token, etc.)
 * before persisting them in SQLite. The master key is derived from
 * `ENCRYPTION_KEY` (preferred) or `ADMIN_PASSWORD` (dev fallback).
 *
 * Algorithm: AES-256-GCM, 12-byte IV, 16-byte auth tag.
 * Wire format: "v1:<iv-b64>:<tag-b64>:<data-b64>"
 *
 * The version prefix is intentional: it lets us migrate to a new
 * algorithm or KDF later ("v2:...") without breaking previously
 * encrypted rows. decryptString() falls back to plaintext if it
 * cannot recognise the version prefix — useful when migrating an
 * existing database that stored values in the clear.
 */

import crypto from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const VERSION = 'v1';

let _cachedKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const raw =
    process.env.ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    'medos-default-dev-key-please-set-ENCRYPTION_KEY';
  if (!process.env.ENCRYPTION_KEY) {
    // Loud, one-time warning so operators know the deployment is using
    // the development fallback. Never silently accept this in prod.
    console.warn(
      '[crypto] ENCRYPTION_KEY is not set — derived a fallback key from ADMIN_PASSWORD. Set ENCRYPTION_KEY (32 random bytes hex) before going to production.',
    );
  }
  _cachedKey = crypto.createHash('sha256').update(raw).digest();
  return _cachedKey;
}

/** Encrypt a UTF-8 string. Returns '' for empty input. */
export function encryptString(plain: string): string {
  if (!plain) return '';
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * Decrypt a string produced by encryptString(). If the payload does not
 * carry a recognised version prefix we assume it is legacy plaintext and
 * return it unchanged — supports zero-downtime backfill.
 */
export function decryptString(payload: string): string {
  if (!payload) return '';
  const parts = payload.split(':');
  if (parts[0] !== VERSION || parts.length !== 4) return payload;
  try {
    const [, ivB, tagB, dataB] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivB, 'base64');
    const tag = Buffer.from(tagB, 'base64');
    const data = Buffer.from(dataB, 'base64');
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (e: any) {
    console.error('[crypto] decryptString failed:', e?.message);
    return '';
  }
}

/**
 * Mask a secret for display. Keeps the last `keepLast` characters so the
 * operator can recognise which token is configured without exposing it.
 *
 *   redact('hf_aBcDeFgHiJ') -> '••••HiJ'
 */
export function redact(value: string | undefined | null, keepLast = 4): string {
  if (!value) return '';
  if (value.length <= keepLast) return '•'.repeat(8);
  return `${'•'.repeat(8)}${value.slice(-keepLast)}`;
}

/** Constant-time string comparison — use for token/secret equality checks. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Per-user settings store.
 *
 * Single source of truth for everything that belongs to ONE user but is
 * NOT raw clinical data:
 *   - UI preferences   (language, country, units, theme)
 *   - LLM preferences  (defaultModel — overrides admin default at chat time)
 *   - EHR profile      (the structured wizard data: demographics, conditions,
 *                       allergies, lifestyle). NOT free-form chat history.
 *   - BYO Hugging Face token (encrypted at rest with lib/crypto)
 *
 * Why a dedicated table instead of overloading `health_data`?
 *   - There is exactly one settings row per user: PK on user_id makes upsert
 *     trivial and read O(1) without sorting.
 *   - The encrypted token field is sensitive enough that it should not share
 *     a row with arbitrary JSON blobs that the chat API will read.
 *
 * Server-only module: never import from a client component.
 */

import { getDb } from './db';
import { decryptString, encryptString } from './crypto';

export interface UserSettings {
  language?: string;
  country?: string;
  units?: 'metric' | 'imperial';
  defaultModel?: string;
  theme?: 'light' | 'dark' | 'auto';
  /** EHR wizard data (demographics, conditions, allergies, lifestyle, ...). */
  ehr?: Record<string, any>;
  /** Plaintext BYO Hugging Face token. Always encrypted at rest. */
  hfToken?: string;
}

export function getUserSettings(userId: string): UserSettings {
  if (!userId) return {};
  const db = getDb();
  const row = db
    .prepare(
      `SELECT language, country, units, default_model, theme, ehr, hf_token_encrypted
       FROM user_settings WHERE user_id = ?`,
    )
    .get(userId) as any;
  if (!row) return { ehr: {} };
  return {
    language: row.language || undefined,
    country: row.country || undefined,
    units: (row.units as 'metric' | 'imperial' | null) || undefined,
    defaultModel: row.default_model || undefined,
    theme: (row.theme as 'light' | 'dark' | 'auto' | null) || undefined,
    ehr: row.ehr ? safeJson(row.ehr, {}) : {},
    hfToken: row.hf_token_encrypted ? decryptString(row.hf_token_encrypted) : undefined,
  };
}

/**
 * Merge `patch` into the existing settings row and persist.
 *
 * Special handling:
 *   - Pass `hfToken: ''` to clear a previously stored BYO token.
 *   - Pass `hfToken: undefined` (or omit) to leave it untouched.
 *   - `ehr` is shallow-merged so the wizard can patch step by step.
 */
export function upsertUserSettings(
  userId: string,
  patch: Partial<UserSettings>,
): void {
  if (!userId) throw new Error('upsertUserSettings: userId required');

  const cur = getUserSettings(userId);

  const merged: UserSettings = {
    language: pick(patch.language, cur.language),
    country: pick(patch.country, cur.country),
    units: pick(patch.units, cur.units),
    defaultModel: pick(patch.defaultModel, cur.defaultModel),
    theme: pick(patch.theme, cur.theme),
    ehr: patch.ehr ? { ...(cur.ehr || {}), ...patch.ehr } : cur.ehr || {},
    // Token rotation: only touch column if caller passed the field.
    hfToken: patch.hfToken === undefined ? cur.hfToken : patch.hfToken || undefined,
  };

  const ehrJson = JSON.stringify(merged.ehr || {});
  const tokenEnc = merged.hfToken ? encryptString(merged.hfToken) : null;

  const db = getDb();
  db.prepare(
    `INSERT INTO user_settings
       (user_id, language, country, units, default_model, theme, ehr, hf_token_encrypted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       language           = excluded.language,
       country            = excluded.country,
       units              = excluded.units,
       default_model      = excluded.default_model,
       theme              = excluded.theme,
       ehr                = excluded.ehr,
       hf_token_encrypted = excluded.hf_token_encrypted,
       updated_at         = datetime('now')`,
  ).run(
    userId,
    merged.language || null,
    merged.country || null,
    merged.units || null,
    merged.defaultModel || null,
    merged.theme || null,
    ehrJson,
    tokenEnc,
  );
}

function pick<T>(next: T | undefined, prev: T | undefined): T | undefined {
  return next === undefined ? prev : next;
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

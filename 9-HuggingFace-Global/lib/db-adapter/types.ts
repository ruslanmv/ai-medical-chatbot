/**
 * Row types shared by the Postgres and SQLite adapters.
 *
 * These mirror the persisted columns 1:1 in snake_case. The repository
 * methods return these rows directly so route handlers don't have to
 * know which driver is underneath. ISO-8601 strings are used for every
 * timestamp on both drivers — Postgres stores them as TIMESTAMPTZ, the
 * adapter casts to/from text at the boundary, and SQLite keeps the
 * existing text format. This means timestamp comparisons happen in JS,
 * not SQL — a small performance cost in exchange for one less dialect
 * difference to maintain.
 */

export interface UserRow {
  id: string;
  email: string;
  password: string;                  // bcrypt hash
  display_name: string | null;
  email_verified: boolean;
  is_admin: boolean;
  is_active: boolean;
  verification_code: string | null;
  verification_expires: string | null;
  reset_token: string | null;
  reset_expires: string | null;
  last_login_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Minimal projection used by /api/auth/me and authenticateRequest(). */
export interface UserPublicRow {
  id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SessionRow {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

/** Result of joining sessions → users — what authenticateRequest needs. */
export interface SessionWithUserRow {
  // session
  token: string;
  expires_at: string;
  // user (public projection)
  user_id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  is_admin: boolean;
  is_active: boolean;
}

export interface NewUserInput {
  id: string;
  email: string;                     // already lowercased by caller
  passwordHash: string;
  displayName: string | null;
  verificationCode: string | null;
  verificationExpires: string | null;
}

export interface AuditEntryRow {
  id: string;
  user_id: string | null;
  action: string;
  ip: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface NewAuditEntry {
  userId?: string | null;
  action: string;
  ip?: string | null;
  meta?: Record<string, unknown>;
}

/* ---------- health data ---------- */

export interface HealthDataRow {
  id: string;
  user_id: string;
  type: string;
  data: string;                      // JSON, kept as text — caller parses
  created_at: string;
  updated_at: string;
}

export interface NewHealthData {
  userId: string;
  type: string;
  data: string;                      // already JSON-stringified
}

/* ---------- chat history ---------- */

export interface ChatHistoryRow {
  id: string;
  user_id: string;
  preview: string | null;
  messages: string;                  // JSON
  topic: string | null;
  created_at: string;
}

export interface NewChatHistory {
  id: string;
  userId: string;
  preview: string | null;
  messages: string;                  // already JSON-stringified
  topic: string | null;
}

/* ---------- user settings ---------- */

export interface UserSettingsRow {
  user_id: string;
  language: string | null;
  country: string | null;
  units: string | null;
  default_model: string | null;
  theme: string | null;
  ehr: string;                       // JSON, defaults to "{}"
  hf_token_encrypted: string | null;
  updated_at: string;
}

export interface UserSettingsUpdate {
  userId: string;
  language?: string | null;
  country?: string | null;
  units?: string | null;
  defaultModel?: string | null;
  theme?: string | null;
  ehr?: string;
  hfTokenEncrypted?: string | null;
}

/* ---------- scan log ---------- */

export interface NewScanLog {
  userId: string | null;
  ip: string | null;
  status: number;
  bytes: number;
  latencyMs: number;
  model: string | null;
}

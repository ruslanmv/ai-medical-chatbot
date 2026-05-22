/**
 * Async DbAdapter — the single repository contract every route handler
 * uses to talk to the database. Two implementations exist:
 *
 *   - PostgresAdapter   (production, behind DATABASE_URL)
 *   - SqliteAdapter     (fallback, file at $DB_PATH)
 *
 * Both speak the same SQL semantics by storing timestamps as ISO strings
 * and normalising email to lowercase at write time. Differences live
 * inside each implementation and inside the migration files.
 *
 * Edits to this interface affect both drivers — keep it lean. New
 * routes should add a method here rather than reach for `pg` or
 * `better-sqlite3` directly.
 */

import type {
  AuditEntryRow,
  ChatHistoryRow,
  HealthDataRow,
  NewAuditEntry,
  NewChatHistory,
  NewHealthData,
  NewScanLog,
  NewUserInput,
  SessionWithUserRow,
  UserPublicRow,
  UserRow,
  UserSettingsRow,
  UserSettingsUpdate,
} from './types';

export interface DbAdapter {
  /* ---------- lifecycle ---------- */

  /** Run pending migrations idempotently. Safe to call at process start. */
  migrate(): Promise<void>;

  /**
   * Seed the default admin if it doesn't already exist. Reads
   * ADMIN_EMAIL / ADMIN_PASSWORD from env. Refuses to seed with the
   * legacy "admin123456" default when NODE_ENV=production.
   */
  seedAdmin(): Promise<void>;

  /** Close all connections / handles. Used in tests and on shutdown. */
  close(): Promise<void>;

  /** Identifies the active driver — useful for logs and `/api/health`. */
  driver(): 'postgres' | 'sqlite';

  /* ---------- users ---------- */

  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  findUserPublicById(id: string): Promise<UserPublicRow | null>;

  insertUser(user: NewUserInput): Promise<void>;

  /** Replace the bcrypt hash. */
  updateUserPassword(id: string, passwordHash: string): Promise<void>;

  /** Set or clear the 6-digit email-verification code + expiry. */
  setVerificationCode(
    id: string,
    code: string | null,
    expires: string | null,
  ): Promise<void>;

  /** Mark the email verified and clear the verification code. */
  markEmailVerified(id: string): Promise<void>;

  /** Set or clear the 6-digit password-reset token + expiry. */
  setResetToken(
    id: string,
    token: string | null,
    expires: string | null,
  ): Promise<void>;

  /** Best-effort timestamp update on successful login. */
  setLastLogin(id: string): Promise<void>;

  /**
   * Hard-delete a user. Health data, chat history, settings, and
   * sessions are removed by ON DELETE CASCADE. Audit log entries are
   * intentionally not cascaded — they retain forensic value.
   */
  deleteUser(id: string): Promise<void>;

  /* ---------- sessions ---------- */

  insertSession(
    token: string,
    userId: string,
    expiresAt: string,
  ): Promise<void>;

  /**
   * Single lookup used by every authenticated request. Returns the
   * joined session + user row when the session is unexpired and the
   * user is active; null otherwise.
   */
  findSessionWithUser(token: string): Promise<SessionWithUserRow | null>;

  deleteSession(token: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  pruneExpiredSessions(): Promise<void>;

  /* ---------- audit log ---------- */

  insertAuditLog(entry: NewAuditEntry): Promise<void>;

  /**
   * Recent audit entries for a single user. Used by the admin
   * dashboard. The full audit table is large; bound the page size at
   * the route layer.
   */
  listAuditForUser(userId: string, limit: number): Promise<AuditEntryRow[]>;

  /* ---------- health data ---------- */

  insertHealthData(input: NewHealthData & { id: string }): Promise<void>;
  listHealthDataForUser(userId: string, type?: string): Promise<HealthDataRow[]>;
  deleteHealthData(id: string, userId: string): Promise<void>;

  /* ---------- chat history ---------- */

  insertChatHistory(input: NewChatHistory): Promise<void>;
  listChatHistoryForUser(userId: string, limit: number): Promise<ChatHistoryRow[]>;
  getChatHistory(id: string, userId: string): Promise<ChatHistoryRow | null>;
  deleteChatHistory(id: string, userId: string): Promise<void>;

  /* ---------- user settings ---------- */

  getUserSettings(userId: string): Promise<UserSettingsRow | null>;
  upsertUserSettings(update: UserSettingsUpdate): Promise<void>;

  /* ---------- scan log ---------- */

  insertScanLog(entry: NewScanLog): Promise<void>;

  /* ---------- admin ---------- */

  /** Page through users for the admin dashboard. */
  listUsers(opts: { limit: number; offset: number }): Promise<UserPublicRow[]>;
  countUsers(): Promise<number>;

  setUserActive(
    id: string,
    isActive: boolean,
    disabledReason?: string | null,
  ): Promise<void>;

  setUserAdmin(id: string, isAdmin: boolean): Promise<void>;
}

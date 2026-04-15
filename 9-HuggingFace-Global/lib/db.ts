/**
 * MedOS database layer — SQLite via better-sqlite3.
 *
 * Architecture:
 *   - SQLite, single file at `$DB_PATH` (/data/medos.db on HF Spaces).
 *   - WAL mode for concurrent reads during SSE streaming.
 *   - Auto-migration via PRAGMA user_version.
 *   - All queries use parameterized statements (no SQL injection).
 *
 * Migration history:
 *   v1  initial schema (users, sessions, health_data, chat_history)
 *   v2  per-user isolation: user_settings, audit_log, scan_log
 *   v3  admin user-management flags: is_active, last_login_at,
 *       disabled_reason  (ADDITIVE — new columns default to a value that
 *       leaves every v2 user indistinguishable from the pre-v3 state)
 */

import Database from 'better-sqlite3';
import { randomUUID, randomInt } from 'crypto';

const DB_PATH = process.env.DB_PATH || '/data/medos.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.pragma('foreign_keys = ON');
  runMigrations(_db);
  seedAdmin();
  return _db;
}

// ============================================================
// Migrations — version-gated, idempotent, additive
// ============================================================

function runMigrations(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id                    TEXT PRIMARY KEY,
        email                 TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password              TEXT NOT NULL,
        display_name          TEXT,
        email_verified        INTEGER DEFAULT 0,
        is_admin              INTEGER DEFAULT 0,
        verification_code     TEXT,
        verification_expires  TEXT,
        reset_token           TEXT,
        reset_expires         TEXT,
        created_at            TEXT DEFAULT (datetime('now')),
        updated_at            TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token       TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at  TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS health_data (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL,
        data        TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preview     TEXT,
        messages    TEXT NOT NULL,
        topic       TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_health_user_type ON health_data(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    // v2: per-user isolation tables.
    //
    // user_settings   one row per user; holds preferences (language,
    //                 country, units, theme, default model) plus the
    //                 EHR profile JSON and an OPTIONAL BYO Hugging
    //                 Face token stored encrypted at rest.
    //
    // audit_log       append-only security/forensic log. See lib/audit.ts.
    //
    // scan_log        per-call accounting for /api/scan so admins can
    //                 see usage by user and detect runaway costs on the
    //                 shared HF_TOKEN_INFERENCE quota.
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        language           TEXT,
        country            TEXT,
        units              TEXT,
        default_model      TEXT,
        theme              TEXT,
        ehr                TEXT NOT NULL DEFAULT '{}',
        hf_token_encrypted TEXT,
        updated_at         TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id          TEXT PRIMARY KEY,
        user_id     TEXT,
        action      TEXT NOT NULL,
        ip          TEXT,
        meta        TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_log(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_log(action, created_at DESC);

      CREATE TABLE IF NOT EXISTS scan_log (
        id          TEXT PRIMARY KEY,
        user_id     TEXT,
        ip          TEXT,
        status      INTEGER NOT NULL,
        bytes       INTEGER NOT NULL DEFAULT 0,
        latency_ms  INTEGER NOT NULL DEFAULT 0,
        model       TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_scan_user_time ON scan_log(user_id, created_at DESC);

      PRAGMA user_version = 2;
    `);
  }

  if (version < 3) {
    // v3 — admin user-management flags.
    //
    // Every column is added with a DEFAULT so existing rows are fully
    // populated without a backfill step. We use column-presence probes
    // (PRAGMA table_info) because ALTER TABLE ADD COLUMN is not
    // idempotent on SQLite and we want the migration to survive
    // partial-failure re-runs.
    //
    // NOTE: `is_active` defaults to 1, so all pre-v3 users remain
    // enabled on upgrade. Admins can deactivate later via the
    // user-management endpoint added in the same release.
    const cols = db
      .prepare(`PRAGMA table_info(users)`)
      .all() as Array<{ name: string }>;
    const has = (name: string) => cols.some((c) => c.name === name);

    if (!has('is_active')) {
      db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
    }
    if (!has('last_login_at')) {
      db.exec(`ALTER TABLE users ADD COLUMN last_login_at TEXT;`);
    }
    if (!has('disabled_reason')) {
      db.exec(`ALTER TABLE users ADD COLUMN disabled_reason TEXT;`);
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      PRAGMA user_version = 3;
    `);
  }
}

// ============================================================
// Helpers
// ============================================================

export function genId(): string {
  return randomUUID();
}

export function genToken(): string {
  return randomUUID() + '-' + randomUUID();
}

/** 6-digit numeric verification code. */
export function genVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

/** 15 minutes from now (for verification codes). */
export function codeExpiry(): string {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

/** 1 hour from now (for password reset tokens). */
export function resetExpiry(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

/** 30 days from now (for sessions). */
export function sessionExpiry(): string {
  return new Date(Date.now() + 30 * 86400 * 1000).toISOString();
}

export function pruneExpiredSessions(): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

/**
 * Seed the default admin account on first start. The admin email is
 * read from ADMIN_EMAIL env (default: admin@medos.health) and the
 * initial password from ADMIN_PASSWORD (default: admin123456).
 *
 * Change the password immediately after first login.
 */
export function seedAdmin(): void {
  const db = getDb();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@medos.health').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (existing) return; // Already seeded.

  const bcrypt = require('bcryptjs');
  const id = genId();
  const hash = bcrypt.hashSync(adminPassword, 10);

  db.prepare(
    `INSERT INTO users (id, email, password, display_name, email_verified, is_admin)
     VALUES (?, ?, ?, ?, 1, 1)`,
  ).run(id, adminEmail, hash, 'Admin');

  console.log(`[Admin] Default admin seeded: ${adminEmail}`);
}

/**
 * MedOS database layer — SQLite via better-sqlite3.
 *
 * Architecture decisions:
 *   - SQLite is the right choice for <100K users on a single HF Space.
 *     Zero config, single file, production-proven. If MedOS outgrows it,
 *     migrate to Turso (SQLite-compatible, distributed).
 *   - The DB file lives at `$DB_PATH` (default: `/data/medos.db`).
 *     HF Spaces with persistent storage mount `/data/` so the DB
 *     survives container restarts.
 *   - Auto-migration: the schema is applied on first connection via
 *     `PRAGMA user_version` as the migration counter.
 *   - WAL mode for concurrent reads during SSE streaming.
 *   - All queries use parameterized statements (no SQL injection).
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.DB_PATH || '/data/medos.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Performance: WAL mode for concurrent reads, 5s busy timeout.
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.pragma('foreign_keys = ON');

  runMigrations(_db);

  return _db;
}

// ============================================================
// Migrations — version-gated, idempotent
// ============================================================

function runMigrations(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;

  if (version < 1) {
    db.exec(`
      -- Users (optional accounts)
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password    TEXT NOT NULL,
        email       TEXT COLLATE NOCASE,
        display_name TEXT,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      -- Sessions (token-based, 30-day expiry)
      CREATE TABLE IF NOT EXISTS sessions (
        token       TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at  TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      -- Health data (synced from client localStorage)
      CREATE TABLE IF NOT EXISTS health_data (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL,
        data        TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      -- Chat history (full conversation archive)
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
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

      PRAGMA user_version = 1;
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

/**
 * Session expiry: 30 days from now.
 */
export function sessionExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

/**
 * Clean up expired sessions (called lazily on login/auth check).
 */
export function pruneExpiredSessions(): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE expires_at < datetime(\'now\')').run();
}

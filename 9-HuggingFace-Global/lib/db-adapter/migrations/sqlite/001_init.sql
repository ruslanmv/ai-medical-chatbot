-- 001_init.sql (SQLite)
--
-- Initial schema: users, sessions, health_data, chat_history.
-- Equivalent to the v1 block in legacy lib/db.ts.
--
-- Run by lib/db-adapter/migrations/run.ts when the SQLite adapter
-- selects this dialect. Each migration is wrapped in a transaction
-- by the runner; do not BEGIN/COMMIT here.

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

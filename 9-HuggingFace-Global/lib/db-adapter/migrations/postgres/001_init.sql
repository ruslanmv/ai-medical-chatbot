-- 001_init.sql (Postgres)
--
-- Initial schema, Postgres dialect. Mirrors the SQLite version row-for-row.
--
-- Dialect notes vs SQLite:
--   * BOOLEAN replaces INTEGER 0/1 for boolean-shaped columns.
--   * Timestamps are TEXT (ISO 8601) on both drivers so the JS layer
--     can compare them the same way (the alternative — TIMESTAMPTZ —
--     would force the SQLite path to do its own string parsing).
--   * Case-insensitive email uniqueness is a LOWER(email) functional
--     index here instead of COLLATE NOCASE.
--   * No PRAGMA — migration tracking uses the schema_migrations table
--     created by the runner.

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT NOT NULL,
  password              TEXT NOT NULL,
  display_name          TEXT,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin              BOOLEAN NOT NULL DEFAULT FALSE,
  verification_code     TEXT,
  verification_expires  TEXT,
  reset_token           TEXT,
  reset_expires         TEXT,
  created_at            TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at            TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS health_data (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  data        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS chat_history (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preview     TEXT,
  messages    TEXT NOT NULL,
  topic       TEXT,
  created_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_health_user_type ON health_data(user_id, type);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 002_isolation.sql (Postgres)
--
-- Per-user isolation tables. Mirrors the SQLite v2 block.

CREATE TABLE IF NOT EXISTS user_settings (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language           TEXT,
  country            TEXT,
  units              TEXT,
  default_model      TEXT,
  theme              TEXT,
  ehr                TEXT NOT NULL DEFAULT '{}',
  hf_token_encrypted TEXT,
  updated_at         TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  action      TEXT NOT NULL,
  ip          TEXT,
  meta        TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
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
  created_at  TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_scan_user_time ON scan_log(user_id, created_at DESC);

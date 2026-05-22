-- 003_admin_flags.sql (Postgres)
--
-- Admin user-management columns: is_active, last_login_at, disabled_reason.
-- All ADDITIVE — every column ships with a DEFAULT so pre-v3 rows are
-- fully populated without a backfill step.
--
-- Postgres supports IF NOT EXISTS on ADD COLUMN, so the runner does NOT
-- need its sqlite-style per-statement try/catch here.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

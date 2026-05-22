-- 003_admin_flags.sql (SQLite)
--
-- Admin user-management columns: is_active, last_login_at, disabled_reason.
-- All ADDITIVE — every column ships with a DEFAULT so pre-v3 rows are
-- fully populated without a backfill step.
--
-- SQLite's ALTER TABLE ADD COLUMN is not idempotent (it errors if the
-- column already exists), so the runner uses CREATE TABLE IF NOT EXISTS
-- probes elsewhere. For this file we accept ALTER errors when re-run
-- via the runner's per-statement try/catch on idempotent migrations
-- (sqlite-only behavior; see run.ts).

ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN disabled_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

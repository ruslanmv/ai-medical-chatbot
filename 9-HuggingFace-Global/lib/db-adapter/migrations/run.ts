/**
 * Migration runner — driver-agnostic.
 *
 * Each adapter passes in a minimal "executor" interface; this module
 * does the bookkeeping (which migrations to run, in what order, idempotently).
 *
 * Migrations live in:
 *   ./sqlite/NNN_<name>.sql      run by SqliteAdapter
 *   ./postgres/NNN_<name>.sql    run by PostgresAdapter
 *
 * Bookkeeping:
 *   - Postgres: a `schema_migrations` table (id TEXT PRIMARY KEY, applied_at TEXT).
 *   - SQLite:   `PRAGMA user_version` is kept in sync (legacy compat) AND
 *               a parallel `schema_migrations` table is maintained for forward
 *               compatibility. Either one is authoritative on its driver.
 *
 * Ordering is lexicographic on the filename — keep the `NNN_` prefix.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Driver-agnostic SQL executor the runner needs. Each adapter implements
 * this with whatever its native client provides.
 */
export interface MigrationExecutor {
  /** Driver name; used to pick the migrations subdirectory. */
  driver: 'sqlite' | 'postgres';

  /** Execute a single SQL statement. */
  exec(sql: string): Promise<void>;

  /**
   * Execute a single SQL statement, swallowing "already exists" errors.
   * Required for SQLite's non-idempotent ALTER TABLE ADD COLUMN.
   * Postgres can implement this as a thin wrapper around exec() because
   * we use ADD COLUMN IF NOT EXISTS in the .sql files.
   */
  execTolerant(sql: string): Promise<void>;

  /** Return the set of migration IDs already applied. */
  appliedIds(): Promise<Set<string>>;

  /** Record a migration ID as applied. */
  recordApplied(id: string): Promise<void>;
}

/**
 * Read all migration files for a given driver, sorted by filename.
 */
function listMigrations(driver: 'sqlite' | 'postgres'): Array<{ id: string; sql: string }> {
  const dir = path.join(__dirname, driver);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({
      id: f.replace(/\.sql$/, ''),
      sql: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));
}

/**
 * Split a SQL file into individual statements. We intentionally use a
 * simple split-on-semicolon: our migrations are hand-written, do not
 * contain semicolons inside string literals, and do not use stored
 * procedures or DO blocks. If that ever changes, switch to a real parser.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^\s*--/.test(s));
}

/**
 * Pending migrations (not yet applied), in order.
 */
async function pending(executor: MigrationExecutor): Promise<Array<{ id: string; sql: string }>> {
  const all = listMigrations(executor.driver);
  const applied = await executor.appliedIds();
  return all.filter((m) => !applied.has(m.id));
}

/**
 * Run all pending migrations for the given executor.
 *
 * `tolerantIds` lists migration IDs whose statements should be run with
 * execTolerant() — the SQLite v3 admin-flags migration is the only such
 * case today (ALTER TABLE ADD COLUMN is not idempotent on SQLite).
 */
export async function runMigrations(
  executor: MigrationExecutor,
  tolerantIds: Set<string> = new Set(),
): Promise<{ applied: string[] }> {
  const toRun = await pending(executor);
  const appliedNow: string[] = [];

  for (const migration of toRun) {
    const statements = splitStatements(migration.sql);
    const useTolerant = tolerantIds.has(migration.id);
    for (const stmt of statements) {
      if (useTolerant) {
        await executor.execTolerant(stmt);
      } else {
        await executor.exec(stmt);
      }
    }
    await executor.recordApplied(migration.id);
    appliedNow.push(migration.id);
  }

  return { applied: appliedNow };
}

/**
 * Standard set of tolerantIds for SQLite — currently just 003_admin_flags
 * because SQLite's ALTER TABLE ADD COLUMN errors when the column already
 * exists.
 */
export const SQLITE_TOLERANT_MIGRATIONS = new Set<string>(['003_admin_flags']);

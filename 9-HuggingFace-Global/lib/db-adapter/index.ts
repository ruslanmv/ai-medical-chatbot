/**
 * Adapter selection — chooses Postgres or SQLite at runtime based on a
 * SINGLE env var: DATABASE_URL.
 *
 * Selection rules (no extra config flags):
 *
 *   DATABASE_URL set and looks like postgres:
 *     → PostgresAdapter
 *
 *   DATABASE_URL unset or invalid:
 *     → SqliteAdapter at $DB_PATH (default /data/medos.db)
 *
 *   …UNLESS we appear to be running in production and the URL is
 *   missing, in which case we refuse to start. The check is implicit
 *   from NODE_ENV — no new flag required.
 */

import type { DbAdapter } from './interface';

let cached: DbAdapter | null = null;

/** Returns the singleton adapter for this process. */
export function getDbAdapter(): DbAdapter {
  if (cached) return cached;

  const raw = (process.env.DATABASE_URL || '').trim();
  const looksPg = /^postgres(ql)?:\/\//.test(raw);

  if (looksPg) {
    // Lazy require so the SQLite-only deploys don't pull in pg's deps.
    const { PostgresAdapter } = require('./postgres') as typeof import('./postgres');
    cached = new PostgresAdapter(raw);
    return cached;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Production deploy detected (NODE_ENV=production) but DATABASE_URL ' +
        'is unset or invalid. Refusing to fall back to SQLite. ' +
        'See 9-HuggingFace-Global/docs/DEPLOYMENT_DB.md.',
    );
  }

  const { SqliteAdapter } = require('./sqlite') as typeof import('./sqlite');
  cached = new SqliteAdapter(process.env.DB_PATH || '/data/medos.db');
  return cached;
}

/** Test-only: swap in a custom adapter (e.g., an in-memory fake). */
export function setDbAdapterForTests(adapter: DbAdapter | null): void {
  cached = adapter;
}

export type { DbAdapter } from './interface';
export type * from './types';

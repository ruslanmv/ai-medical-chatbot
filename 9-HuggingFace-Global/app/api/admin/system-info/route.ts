import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { requireAdmin } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { CONFIG_PATH } from '@/lib/server-config';

/**
 * GET /api/admin/system-info — operational diagnostics for the admin panel.
 *
 * Returns non-sensitive runtime facts about the deployment so ops can
 * debug "why isn't feature X working" without SSH'ing into the Space:
 *   - Node + platform versions
 *   - DB path, size, schema version (PRAGMA user_version), row counts
 *   - Config file path, existence, size, last-modified
 *   - Encryption-key presence (boolean only — never the value)
 *   - Uptime, memory, load averages
 *   - Feature-flag / env presence map (booleans only)
 *
 * No secret values are ever returned. Admin-only endpoint.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeStat(p: string) {
  try {
    const s = fs.statSync(p);
    return {
      exists: true,
      sizeBytes: s.size,
      modifiedAt: s.mtime.toISOString(),
    };
  } catch {
    return { exists: false };
  }
}

function envFlag(name: string): boolean {
  return !!(process.env[name] && process.env[name]!.length > 0);
}

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const db = getDb();

  const dbPath = process.env.DB_PATH || '/data/medos.db';
  const persistentDir = process.env.PERSISTENT_DIR || path.dirname(dbPath);
  const userVersion = db.pragma('user_version', { simple: true }) as number;
  const journalMode = db.pragma('journal_mode', { simple: true });
  const foreignKeys = db.pragma('foreign_keys', { simple: true });

  // Cheap row counts — all indexed / small-table aggregates, safe to run
  // synchronously on each request.
  const counts = {
    users: (db.prepare('SELECT COUNT(*) c FROM users').get() as any).c as number,
    sessions: (db.prepare('SELECT COUNT(*) c FROM sessions').get() as any).c as number,
    healthData: (db.prepare('SELECT COUNT(*) c FROM health_data').get() as any).c as number,
    chatHistory: (db.prepare('SELECT COUNT(*) c FROM chat_history').get() as any).c as number,
    auditLog: (db.prepare('SELECT COUNT(*) c FROM audit_log').get() as any).c as number,
    scanLog: (db.prepare('SELECT COUNT(*) c FROM scan_log').get() as any).c as number,
  };

  const mem = process.memoryUsage();

  return NextResponse.json({
    runtime: {
      node: process.version,
      platform: `${os.platform()} ${os.release()}`,
      arch: process.arch,
      uptimeSec: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
      pid: process.pid,
    },
    process: {
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      loadAverage: os.loadavg(),
    },
    database: {
      path: dbPath,
      schemaVersion: userVersion,
      journalMode,
      foreignKeys,
      file: safeStat(dbPath),
      counts,
    },
    config: {
      path: CONFIG_PATH,
      persistentDir,
      file: safeStat(CONFIG_PATH),
    },
    security: {
      // Booleans only — never the value. Redaction by construction.
      encryptionKeySet: envFlag('ENCRYPTION_KEY'),
      adminPasswordSet: envFlag('ADMIN_PASSWORD'),
      adminEmailSet: envFlag('ADMIN_EMAIL'),
      scanRequireAuth:
        (process.env.SCAN_REQUIRE_AUTH || '').toLowerCase() !== 'false',
    },
    features: {
      // Presence map for quick "what's wired" answers. No values exposed.
      hfToken: envFlag('HF_TOKEN'),
      hfTokenInference: envFlag('HF_TOKEN_INFERENCE'),
      ollabridgeUrl: envFlag('OLLABRIDGE_URL'),
      ollabridgeKey: envFlag('OLLABRIDGE_API_KEY'),
      openai: envFlag('OPENAI_API_KEY'),
      anthropic: envFlag('ANTHROPIC_API_KEY'),
      groq: envFlag('GROQ_API_KEY'),
      watsonx: envFlag('WATSONX_API_KEY') && envFlag('WATSONX_PROJECT_ID'),
      gemini: envFlag('GEMINI_API_KEY') || envFlag('GOOGLE_API_KEY'),
      openrouter: envFlag('OPENROUTER_API_KEY'),
      together: envFlag('TOGETHER_API_KEY'),
      mistral: envFlag('MISTRAL_API_KEY'),
      smtp: envFlag('SMTP_HOST') && envFlag('SMTP_USER') && envFlag('SMTP_PASS'),
      scannerUrl: envFlag('SCANNER_URL'),
      nearbyUrl: envFlag('NEARBY_URL'),
      allowedOrigins: envFlag('ALLOWED_ORIGINS'),
      appUrl: envFlag('APP_URL'),
    },
  });
}

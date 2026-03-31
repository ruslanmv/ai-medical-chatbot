import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Server-side session counter.
 * Stores count in /tmp/medos-data/sessions.json (persists across requests, resets on container restart).
 * On HF Spaces with persistent storage, use /data/ instead of /tmp/.
 *
 * GET  /api/sessions → returns { count: number }
 * POST /api/sessions → increments and returns { count: number }
 */

const DATA_DIR = process.env.PERSISTENT_DIR || '/tmp/medos-data';
const COUNTER_FILE = join(DATA_DIR, 'sessions.json');
const BASE_COUNT = 423000; // Historical base from before server-side tracking

interface CounterData {
  count: number;
  lastUpdated: string;
}

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCounter(): number {
  ensureDir();
  try {
    if (existsSync(COUNTER_FILE)) {
      const data: CounterData = JSON.parse(readFileSync(COUNTER_FILE, 'utf8'));
      return data.count;
    }
  } catch {
    // corrupted file, reset
  }
  return 0;
}

function incrementCounter(): number {
  ensureDir();
  const current = readCounter();
  const next = current + 1;
  const data: CounterData = {
    count: next,
    lastUpdated: new Date().toISOString(),
  };
  writeFileSync(COUNTER_FILE, JSON.stringify(data), 'utf8');
  return next;
}

export async function GET() {
  const sessionCount = readCounter();
  return NextResponse.json({
    count: BASE_COUNT + sessionCount,
    sessions: sessionCount,
    base: BASE_COUNT,
  });
}

export async function POST() {
  const sessionCount = incrementCounter();
  return NextResponse.json({
    count: BASE_COUNT + sessionCount,
    sessions: sessionCount,
    base: BASE_COUNT,
  });
}

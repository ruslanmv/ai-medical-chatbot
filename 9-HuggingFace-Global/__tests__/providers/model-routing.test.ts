/**
 * Provider model-name routing.
 *
 * Two production incidents are pinned here:
 *
 *  1. Groq retired every hosted Llama chat SKU during 2026. MedOS still
 *     defaulted to `llama-3.3-70b-versatile`, so the primary provider was
 *     dead the moment a key was set — 404 model_decommissioned on every
 *     turn. The chain must name only live SKUs, and a retired id arriving
 *     from a client must be rewritten rather than forwarded.
 *
 *  2. MedOS forwarded the Ollama tag `qwen2.5:1.5b` to OllaBridge-Cloud,
 *     which matches the Cloud's RELAY-DEVICE lookup before its alias
 *     router runs — pinning every turn to whichever home PC was paired
 *     and producing `503 status code (no body)` when it blinked. An
 *     Ollama-shaped tag must become an alias.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveModelChain } from '@/lib/providers/groq';
import {
  resolveOllaBridgeModel,
  isRateLimited,
} from '@/lib/providers/ollabridge';

const RETIRED = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'qwen/qwen3-32b',
];

describe('groq resolveModelChain', () => {
  const savedModel = process.env.GROQ_MODEL;

  beforeEach(() => {
    delete process.env.GROQ_MODEL;
  });
  afterEach(() => {
    if (savedModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = savedModel;
  });

  it('never routes a request to a retired Groq SKU', () => {
    for (const requested of [...RETIRED, 'qwen2.5:1.5b', '', 'gpt-4o']) {
      const chain = resolveModelChain(requested);
      for (const retired of RETIRED) {
        expect(chain).not.toContain(retired);
      }
    }
  });

  it('leads with a live gpt-oss SKU for the MedOS default tag', () => {
    expect(resolveModelChain('qwen2.5:1.5b')[0]).toBe('openai/gpt-oss-20b');
  });

  it('keeps a fallback rung behind the head of the chain', () => {
    expect(resolveModelChain('qwen2.5:1.5b').length).toBeGreaterThan(1);
  });

  it('honours a namespaced Groq id instead of discarding it', () => {
    // `openai/gpt-oss-120b` is a Groq model despite the vendor namespace —
    // the old prefix heuristic read the slash as "not Groq" and dropped it.
    const chain = resolveModelChain('openai/gpt-oss-120b');
    expect(chain[0]).toBe('openai/gpt-oss-120b');
    // …and it is not duplicated further down.
    expect(chain.filter((m) => m === 'openai/gpt-oss-120b')).toHaveLength(1);
  });

  it('puts the GROQ_MODEL override at the head', () => {
    process.env.GROQ_MODEL = 'groq/compound';
    expect(resolveModelChain('qwen2.5:1.5b')[0]).toBe('groq/compound');
  });
});

describe('ollabridge resolveOllaBridgeModel', () => {
  const saved = process.env.OLLABRIDGE_MODEL;

  beforeEach(() => {
    delete process.env.OLLABRIDGE_MODEL;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.OLLABRIDGE_MODEL;
    else process.env.OLLABRIDGE_MODEL = saved;
  });

  it('rewrites Ollama tags to an alias so the Cloud router handles them', () => {
    expect(resolveOllaBridgeModel('qwen2.5:1.5b')).toBe('free-best');
    expect(resolveOllaBridgeModel('llama3.1:8b')).toBe('free-best');
  });

  it('falls back to the alias when no model is named', () => {
    expect(resolveOllaBridgeModel('')).toBe('free-best');
  });

  it('passes an explicitly named alias or concrete model through', () => {
    expect(resolveOllaBridgeModel('free-fast')).toBe('free-fast');
    expect(resolveOllaBridgeModel('cheap-reasoning')).toBe('cheap-reasoning');
  });

  it('honours the OLLABRIDGE_MODEL override', () => {
    process.env.OLLABRIDGE_MODEL = 'free-fast';
    expect(resolveOllaBridgeModel('qwen2.5:1.5b')).toBe('free-fast');
  });
});

describe('ollabridge isRateLimited', () => {
  it('recognises a 429 carried on the error status', () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isRateLimited({ response: { status: 429 } })).toBe(true);
  });

  it('recognises the SDK message shape for an HTML-bodied edge 429', () => {
    // What the HF edge actually produced in production: the OpenAI SDK
    // prefixes the status and appends the (HTML) body it could not parse.
    expect(
      isRateLimited(new Error('429 <!doctype html>\n<html class="" lang="en">')),
    ).toBe(true);
  });

  it('does not treat other upstream failures as rate limiting', () => {
    expect(isRateLimited({ status: 503 })).toBe(false);
    expect(isRateLimited(new Error('503 status code (no body)'))).toBe(false);
    expect(isRateLimited(new Error('Request timed out.'))).toBe(false);
  });
});

describe('provider chain order', () => {
  /**
   * OllaBridge must be tried before the direct providers.
   *
   * The gateway is the routing authority: one admin curates the free
   * fleet there and every consumer inherits it. Groq used to lead
   * because it was the fastest single provider, which put MedOS's own
   * opinion ahead of that fleet and forced a key into every consumer
   * separately. This asserts on source order rather than behaviour
   * because exercising it for real would mean standing up three
   * providers — and the failure mode being guarded against is someone
   * reordering the blocks, which source order catches exactly.
   */
  it('tries ollabridge before groq on both paths', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(
      new URL('../../lib/providers/index.ts', import.meta.url),
      'utf8',
    );

    for (const suffix of ['', '.nonstream']) {
      const bridge = src.indexOf(`provider.ollabridge.ok${suffix}'`);
      const groq = src.indexOf(`provider.groq.ok${suffix}'`);
      const hf = src.indexOf(`provider.huggingface.ok${suffix}'`);
      expect(bridge, `ollabridge.ok${suffix} not found`).toBeGreaterThan(-1);
      expect(groq, `groq.ok${suffix} not found`).toBeGreaterThan(-1);
      expect(hf, `huggingface.ok${suffix} not found`).toBeGreaterThan(-1);
      expect(bridge, `ollabridge must precede groq on the${suffix || ' stream'} path`)
        .toBeLessThan(groq);
      expect(groq, `groq must precede huggingface on the${suffix || ' stream'} path`)
        .toBeLessThan(hf);
    }
  });
});

describe('settings preset wiring', () => {
  /**
   * The Settings model picker used to be decorative.
   *
   * The client put `preset` on the wire and the chat route only ever
   * read `model`, so every option in that picker produced an identical
   * request. These pin that each preset the client can send maps to a
   * route the gateway actually publishes.
   */
  const CLIENT_PRESETS = [
    'free-best',
    'free-fastest',
    'free-flexible',
    'deep-reasoning',
    'local',
    'ollabridge',
  ];

  async function routeSource(): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile(
      new URL('../../app/api/chat/route.ts', import.meta.url),
      'utf8',
    );
  }

  it('accepts every preset the client can send', async () => {
    const src = await routeSource();
    const start = src.indexOf('preset: z');
    expect(start, 'route schema has no preset field at all').toBeGreaterThan(-1);
    const schema = src.slice(start, src.indexOf('.optional()', start));
    expect(schema.length, 'preset enum block came back empty').toBeGreaterThan(0);
    for (const p of CLIENT_PRESETS) {
      expect(schema, `route schema rejects preset ${p}`).toContain(`'${p}'`);
    }
  });

  it('maps every preset to a gateway route, none left unrouted', async () => {
    const src = await routeSource();
    const table = src.slice(
      src.indexOf('const PRESET_TO_ALIAS'),
      src.indexOf('};', src.indexOf('const PRESET_TO_ALIAS')),
    );
    // Routes the gateway publishes, plus its always-on local model.
    const GATEWAY_ROUTES = [
      'free-best',
      'free-fast',
      'free-flex',
      'cheap-reasoning',
      'qwen2.5:0.5b',
    ];
    for (const p of CLIENT_PRESETS) {
      const line = table
        .split('\n')
        .find((l) => l.includes(`${p}:`) || l.includes(`'${p}':`));
      expect(line, `preset ${p} has no alias mapping`).toBeTruthy();
      expect(
        GATEWAY_ROUTES.some((r) => line!.includes(`'${r}'`)),
        `preset ${p} maps to something the gateway does not publish: ${line}`,
      ).toBe(true);
    }
  });

  it('lets the preset outrank the legacy default model name', async () => {
    const src = await routeSource();
    expect(src).toContain('PRESET_TO_ALIAS[preset]) || requestedModel');
  });
});

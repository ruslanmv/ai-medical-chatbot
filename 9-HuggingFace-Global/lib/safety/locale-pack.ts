/**
 * Typed loader for the regional medical locale packs in config/locales/.
 *
 * Reads the JSON pack matching the request's country code (and falls back
 * to en-US if the requested pack is missing). The loader is read-only and
 * cached per-process; reload requires a process restart, which is fine
 * because locale packs change rarely.
 *
 * Edits to the schema or the loader are SAFETY-SENSITIVE under
 * GOVERNANCE.md and the *.medical.json files have their own review path.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface LocalePack {
  locale: string;
  language: string;
  country: string;
  units: { temperature: 'C' | 'F'; weight: 'kg' | 'lb'; length: 'cm' | 'in' };
  emergency: {
    general: string;
    ambulance: string;
    police: string;
    fire: string;
    crisis?: string;
    poison?: string;
  };
  urgent_care_phrasing: string;
  clinician_phrasing: { gp: string; pediatrician: string; pharmacist: string };
  pediatric: {
    infant_fever_threshold_c: number;
    pediatric_emergency_age_years: number;
    infant_age_months_max: number;
  };
  pregnancy: { phrase_for_emergency_evaluation: string };
  medications: Record<string, string[]>;
  disclaimer: { general: string; mental_health_crisis_addendum: string };
  crisis_resources: Array<{ name: string; number: string; scope: string }>;
}

// Resolve from this file's location to the repo-root config/locales/ folder.
// Works in both Next.js server runtime and the tsx golden-test runner.
const LOCALES_DIR = resolve(__dirname, '..', '..', '..', 'config', 'locales');
const FALLBACK_COUNTRY = 'US';

const cache = new Map<string, LocalePack>();
let availableCountries: Set<string> | null = null;

function listAvailableCountries(): Set<string> {
  if (availableCountries) return availableCountries;
  try {
    const files = readdirSync(LOCALES_DIR);
    const codes = new Set<string>();
    for (const f of files) {
      const m = f.match(/^([a-z]{2})-([A-Z]{2})\.medical\.json$/);
      if (m) codes.add(m[2]!);
    }
    availableCountries = codes;
  } catch {
    availableCountries = new Set([FALLBACK_COUNTRY]);
  }
  return availableCountries;
}

function loadPackByLocale(locale: string): LocalePack | null {
  if (cache.has(locale)) return cache.get(locale)!;
  const file = join(LOCALES_DIR, `${locale}.medical.json`);
  try {
    const raw = readFileSync(file, 'utf8');
    const pack = JSON.parse(raw) as LocalePack;
    cache.set(locale, pack);
    return pack;
  } catch {
    return null;
  }
}

/**
 * Pick the best pack for a given country code. Prefers an exact match
 * (e.g. country=BR matches pt-BR), then falls back to the first pack we
 * have for the country, then to en-US.
 */
export function getLocalePackForCountry(country: string): LocalePack {
  const target = country?.toUpperCase() || FALLBACK_COUNTRY;

  // Exact-country lookup: scan filenames once.
  const known = listAvailableCountries();
  if (known.has(target)) {
    // Find the first locale file whose country code matches.
    try {
      const files = readdirSync(LOCALES_DIR);
      const match = files.find((f) => f.endsWith(`-${target}.medical.json`));
      if (match) {
        const locale = match.replace('.medical.json', '');
        const pack = loadPackByLocale(locale);
        if (pack) return pack;
      }
    } catch {
      /* fall through */
    }
  }

  const fallback = loadPackByLocale('en-US');
  if (!fallback) {
    throw new Error('Critical: en-US locale pack missing from config/locales/');
  }
  return fallback;
}

/**
 * Resolve a pack from an explicit BCP-47 locale string (e.g. 'pt-BR').
 * Falls back to country-based lookup if the exact locale isn't present.
 */
export function getLocalePack(locale: string): LocalePack {
  const exact = loadPackByLocale(locale);
  if (exact) return exact;
  const country = locale.split('-')[1] || FALLBACK_COUNTRY;
  return getLocalePackForCountry(country);
}

import { NextResponse } from 'next/server';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * IP-based country + language + emergency number detection.
 *
 * Privacy posture:
 *  - Platform geo headers are read first (zero external calls, zero PII).
 *  - If nothing is present we fall back to ipapi.co (free, no key), but
 *    ONLY for public IPs — RFC1918, loopback, and link-local are never
 *    sent outbound.
 *  - The client IP is never logged or returned.
 */

const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-nf-country',
  'cloudfront-viewer-country',
  'x-appengine-country',
  'fly-client-ip-country',
  'x-forwarded-country',
] as const;

// Country → best-effort primary language out of the ones MedOS ships.
// Kept local to this file so we don't bloat lib/i18n for a single use.
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  NG: 'en', KE: 'en', GH: 'en', UG: 'en', SG: 'en', MY: 'en', IN: 'en',
  PK: 'en', BD: 'en', LK: 'en', PH: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr',
  CD: 'fr', HT: 'fr', DZ: 'fr', TN: 'fr', MA: 'ar',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  IT: 'it', SM: 'it', VA: 'it',
  NL: 'nl', SR: 'nl',
  PL: 'pl',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  TR: 'tr',
  SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', IQ: 'ar', SY: 'ar', LB: 'ar',
  YE: 'ar', LY: 'ar', OM: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', SD: 'ar',
  PS: 'ar',
  CN: 'zh', TW: 'zh', HK: 'zh',
  JP: 'ja',
  KR: 'ko',
  TH: 'th',
  VN: 'vi',
  TZ: 'sw',
};

function pickHeaderCountry(req: Request): string | null {
  for (const h of GEO_HEADERS) {
    const v = req.headers.get(h);
    if (v && v.length >= 2 && v.toUpperCase() !== 'XX') {
      return v.toUpperCase().slice(0, 2);
    }
  }
  return null;
}

function extractClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip');
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('fe80:')) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

async function lookupIpapi(ip: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MedOS-Geo/1.0' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = (await res.text()).trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<Response> {
  let country = pickHeaderCountry(req);
  let source: 'header' | 'ipapi' | 'default' = country ? 'header' : 'default';

  if (!country) {
    const ip = extractClientIp(req);
    if (ip && !isPrivateIp(ip)) {
      const looked = await lookupIpapi(ip);
      if (looked) {
        country = looked;
        source = 'ipapi';
      }
    }
  }

  const finalCountry = country || 'US';
  const info = getEmergencyInfo(finalCountry);
  const language = COUNTRY_TO_LANGUAGE[finalCountry] ?? 'en';

  return NextResponse.json(
    {
      country: finalCountry,
      language,
      emergencyNumber: info.emergency,
      source,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'X-Robots-Tag': 'noindex',
      },
    },
  );
}

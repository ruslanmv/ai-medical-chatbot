import { NextResponse } from "next/server";
import {
  getLanguageForCountry,
  getEmergencyNumber,
  type SupportedLanguage,
} from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Headers set by the big platforms. We walk them in priority order.
 * This is a zero-cost lookup — no external call needed when the app is
 * deployed behind Vercel / Cloudflare / Netlify / HF Spaces / AWS CloudFront.
 */
const GEO_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-nf-country",
  "cloudfront-viewer-country",
  "x-appengine-country",
  "fly-client-ip-country",
  "x-forwarded-country",
] as const;

function pickHeaderCountry(req: Request): string | null {
  for (const h of GEO_HEADERS) {
    const v = req.headers.get(h);
    if (v && v.length >= 2 && v.toUpperCase() !== "XX") {
      return v.toUpperCase().slice(0, 2);
    }
  }
  return null;
}

/** Extract the first public IP from x-forwarded-for / x-real-ip. */
function extractClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

/**
 * Last-resort geolocation via ipapi.co (free, no key, 1k/day per IP).
 * Called ONLY when platform headers are absent. Never throws — returns
 * null on any failure so the client can fall back to browser detection.
 */
async function lookupIpapi(ip: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: controller.signal,
      headers: { "User-Agent": "MedOS-Geo/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = (await res.text()).trim().toUpperCase();
    if (text.length === 2 && /^[A-Z]{2}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}

type GeoResponse = {
  country: string;
  language: SupportedLanguage;
  emergencyNumber: string;
  source: "header" | "ipapi" | "default";
};

export async function GET(req: Request): Promise<Response> {
  let country = pickHeaderCountry(req);
  let source: GeoResponse["source"] = country ? "header" : "default";

  if (!country) {
    const ip = extractClientIp(req);
    // Never look up private / loopback addresses.
    if (ip && !isPrivateIp(ip)) {
      const looked = await lookupIpapi(ip);
      if (looked) {
        country = looked;
        source = "ipapi";
      }
    }
  }

  const finalCountry = country || "US";
  const payload: GeoResponse = {
    country: finalCountry,
    language: getLanguageForCountry(finalCountry),
    emergencyNumber: getEmergencyNumber(finalCountry),
    source,
  };

  return NextResponse.json(payload, {
    headers: {
      // The browser may cache its own geo for an hour. The server never
      // caches, and the response never contains the IP.
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}

/**
 * Detect private / loopback / link-local addresses so we never send them
 * to the external geolocation service.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("fe80:")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

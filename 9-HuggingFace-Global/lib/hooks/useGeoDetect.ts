'use client';

import { useEffect, useRef } from 'react';
import type { SupportedLanguage } from '@/lib/i18n';

export interface GeoResult {
  country: string;
  language: SupportedLanguage;
  emergencyNumber: string;
  source: 'header' | 'ipapi' | 'default';
}

interface Options {
  /**
   * When `true`, the hook does NOT apply the detected geo data. The
   * caller has already made an explicit choice (manual language/country
   * pick) and auto-detect must never override it.
   */
  skip: boolean;
  onResult: (result: GeoResult) => void;
}

/**
 * IP-based geo detection, fired exactly once per mount.
 *
 * Silently falls back on every failure (network, 4xx, 5xx, abort) so the
 * caller keeps whatever client-side timezone detection already produced.
 * Uses a 3s timeout to avoid blocking the UI on slow edges.
 */
export function useGeoDetect({ skip, onResult }: Options): void {
  const fired = useRef(false);

  useEffect(() => {
    if (skip || fired.current) return;
    fired.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch('/api/geo', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GeoResult | null) => {
        if (data && data.country) onResult(data);
      })
      .catch(() => {
        /* silent — caller keeps its current values */
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [skip, onResult]);
}

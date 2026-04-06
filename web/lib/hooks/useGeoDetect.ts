"use client";

import { useEffect, useRef } from "react";
import type { SupportedLanguage } from "../i18n";

export type GeoResult = {
  country: string;
  language: SupportedLanguage;
  emergencyNumber: string;
  source: "header" | "ipapi" | "default";
};

type Options = {
  /** When true, the hook will NOT apply the detected value — the user has
   *  already set a language/country explicitly and auto-detect must not
   *  override their choice. */
  skip: boolean;
  onResult: (result: GeoResult) => void;
};

/**
 * Calls `/api/geo` exactly once per mount. Silent on any failure — the
 * existing client-side `detectLanguage()` / `detectCountry()` remain as
 * the ultimate fallback path inside useSettings.
 */
export function useGeoDetect({ skip, onResult }: Options): void {
  const fired = useRef(false);

  useEffect(() => {
    if (skip || fired.current) return;
    fired.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch("/api/proxy/geo", { signal: controller.signal })
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

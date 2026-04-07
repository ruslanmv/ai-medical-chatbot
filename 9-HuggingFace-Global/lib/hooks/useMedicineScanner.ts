"use client";

import { useState, useCallback } from "react";
import type { MedicineItem, MedicineForm } from "@/lib/health-store";

/**
 * Scan endpoint — calls the MedOS backend proxy at /api/scan,
 * which injects the HF_TOKEN_INFERENCE server-side and forwards
 * to the Medicine Scanner Space. No token exposed to the browser.
 *
 * On the Vercel frontend, /api/proxy/scan proxies to the HF backend.
 * On the HF backend, /api/scan proxies to the Scanner Space.
 */
const SCAN_API = "/api/proxy/scan";
const HEALTH_API = "/api/proxy/scan";

interface ScanResult {
  success: boolean;
  medicine?: Omit<MedicineItem, "id" | "createdAt">;
  error?: string;
  model_used?: string;
}

type ScannerStatus = "idle" | "waking" | "scanning";

/**
 * Hook for scanning medicine labels via the MedOS Medicine Scanner.
 *
 * Full lifecycle:
 *   1. Check if Scanner Space is awake (via backend proxy)
 *   2. If sleeping, poll until ready (HF auto-wakes on request)
 *   3. Send image through backend proxy (token injected server-side)
 *   4. Return structured MedicineItem JSON
 *
 * Zero tokens in the browser. All auth is server-side.
 */
export function useMedicineScanner() {
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Check if the Scanner Space is awake via the backend health proxy. */
  const isAwake = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(HEALTH_API, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "ok";
    } catch {
      return false;
    }
  }, []);

  /** Wake the Space if sleeping. Polls until ready (max ~3 min). */
  const wakeSpace = useCallback(async (): Promise<boolean> => {
    if (await isAwake()) return true;

    setStatus("waking");

    // The GET request to the health proxy itself triggers the wake
    // (the backend fetches from the Scanner Space URL, waking it)
    const maxAttempts = 36; // 36 * 5s = 3 min
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      if (await isAwake()) return true;
    }
    return false;
  }, [isAwake]);

  const scan = useCallback(async (imageFile: File | Blob) => {
    setStatus("waking");
    setResult(null);
    setError(null);

    try {
      // Step 1: Ensure Scanner Space is awake
      const awake = await wakeSpace();
      if (!awake) {
        setError("Scanner is starting up. Please try again in a moment.");
        setResult({ success: false, error: "Scanner Space is still waking up." });
        setStatus("idle");
        return;
      }

      // Step 2: Send scan through backend proxy (token injected server-side)
      setStatus("scanning");
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch(SCAN_API, {
        method: "POST",
        body: formData,
        // No Authorization header — the backend proxy adds it
      });

      const data = await response.json();

      if (data.success && data.medicine) {
        const validForms: MedicineForm[] = [
          "tablet", "capsule", "syrup", "inhaler",
          "injection", "cream", "drops", "patch", "other",
        ];
        if (!validForms.includes(data.medicine.form)) {
          data.medicine.form = "other";
        }
        if (typeof data.medicine.quantity !== "number" || data.medicine.quantity < 1) {
          data.medicine.quantity = 1;
        }
        setResult(data);
      } else {
        setError(data.error || "Scan failed");
        setResult(data);
      }
    } catch (e: any) {
      const msg = e?.message || "Network error — scanner unavailable";
      setError(msg);
      setResult({ success: false, error: msg });
    } finally {
      setStatus("idle");
    }
  }, [wakeSpace]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    scan,
    scanning: status !== "idle",
    waking: status === "waking",
    status,
    result,
    error,
    reset,
  };
}

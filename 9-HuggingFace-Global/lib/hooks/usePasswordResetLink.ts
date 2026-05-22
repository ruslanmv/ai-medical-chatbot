"use client";

import { useEffect, useState } from "react";

/**
 * Parses the password-reset deep-link query params on first mount.
 *
 * The reset email contains a link like:
 *   ${APP_URL}?action=reset&email=…&code=…
 *
 * When the user clicks it the app loads with those params; this hook
 * extracts them, validates the shape (6-digit code, non-empty email),
 * and clears them from the URL so a back/forward/refresh doesn't keep
 * the code visible in the address bar.
 *
 * Returns null when there's no reset link in the URL.
 */
export interface PasswordResetLink {
  email: string;
  code: string;
}

export function usePasswordResetLink(): PasswordResetLink | null {
  const [link, setLink] = useState<PasswordResetLink | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "reset") return;

    const email = (params.get("email") || "").trim();
    const code = (params.get("code") || "").trim();
    if (!email || !/^\d{6}$/.test(code)) return;

    setLink({ email, code });

    // Clean the URL so the code isn't sitting in browser history.
    params.delete("action");
    params.delete("email");
    params.delete("code");
    const next = params.toString();
    const cleanUrl =
      window.location.pathname + (next ? `?${next}` : "") + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);
  }, []);

  return link;
}

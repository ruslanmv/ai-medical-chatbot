"use client";

import { useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const TOKEN_KEY = "medos_auth_token";

/**
 * Authentication hook. Guest-first: everything works without login.
 *
 * When logged in:
 *  - token stored in localStorage (for JS access) AND as an httpOnly cookie
 *    (for the proxy route to inject into backend calls).
 *  - /api/proxy/auth/me validates the session on mount.
 *
 * Cookie is set via document.cookie — in production the proxy route reads it.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  // Restore session on mount.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ user: null, token: null, loading: false });
      return;
    }

    // Validate the token against the backend.
    fetch("/api/proxy/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setTokenCookie(token);
          setState({ user: data.user, token, loading: false });
        } else {
          // Expired — clean up.
          clearAuth();
          setState({ user: null, token: null, loading: false });
        }
      })
      .catch(() => {
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const register = useCallback(
    async (
      username: string,
      password: string,
      opts?: { email?: string; displayName?: string },
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/proxy/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            email: opts?.email,
            displayName: opts?.displayName,
          }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Registration failed" };

        localStorage.setItem(TOKEN_KEY, data.token);
        setTokenCookie(data.token);
        setState({ user: data.user, token: data.token, loading: false });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const login = useCallback(
    async (
      username: string,
      password: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/proxy/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Login failed" };

        localStorage.setItem(TOKEN_KEY, data.token);
        setTokenCookie(data.token);
        setState({ user: data.user, token: data.token, loading: false });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch("/api/proxy/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearAuth();
    setState({ user: null, token: null, loading: false });
  }, []);

  return {
    user: state.user,
    token: state.token,
    isAuthenticated: !!state.user,
    isGuest: !state.user,
    loading: state.loading,
    register,
    login,
    logout,
  };
}

function setTokenCookie(token: string): void {
  // Set as a cookie so the proxy route can read it.
  // 30-day expiry. SameSite=Lax for same-origin proxy. Secure in production.
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `medos_token=${token}; path=/; max-age=${30 * 86400}; SameSite=Lax${secure}`;
}

function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = "medos_token=; path=/; max-age=0";
}

"use client";

import { useState } from "react";
import { User2, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface LoginViewProps {
  onLogin: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (
    username: string,
    password: string,
    opts?: { email?: string; displayName?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  language: SupportedLanguage;
}

export function LoginView({ onLogin, onRegister, language }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password required");
      return;
    }
    setLoading(true);
    setError("");

    const result =
      mode === "login"
        ? await onLogin(username, password)
        : await onRegister(username, password, {
            email: email.trim() || undefined,
          });

    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Something went wrong");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-sm mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <User2 size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-ink-base tracking-tight mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-ink-muted">
            {mode === "login"
              ? "Log in to sync your health data across devices"
              : "Free forever. Your data stays private."}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
              Username
            </label>
            <div className="relative">
              <User2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                Email (optional)
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For password recovery"
                  autoComplete="email"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger-500 bg-danger-500/10 border border-danger-500/30 rounded-xl px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-brand-500 hover:text-brand-600 font-semibold transition-colors"
          >
            {mode === "login"
              ? "Don't have an account? Create one"
              : "Already have an account? Log in"}
          </button>
        </div>

        <p className="text-center text-[11px] text-ink-subtle mt-6">
          Account is optional. MedOS works fully without login.
          <br />
          Creating an account lets you sync health data across devices.
        </p>
      </div>
    </div>
  );
}

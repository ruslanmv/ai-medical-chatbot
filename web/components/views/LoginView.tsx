"use client";

import { useState } from "react";
import {
  Mail,
  Lock,
  User2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { type SupportedLanguage } from "@/lib/i18n";

type AuthFlow = "login" | "register" | "verify" | "forgot" | "reset";

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (
    email: string,
    password: string,
    opts?: { displayName?: string },
  ) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  onVerifyEmail: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onResendVerification: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<{ ok: boolean; message?: string }>;
  onResetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  language: SupportedLanguage;
}

export function LoginView({
  onLogin,
  onRegister,
  onVerifyEmail,
  onResendVerification,
  onForgotPassword,
  onResetPassword,
}: LoginViewProps) {
  const [flow, setFlow] = useState<AuthFlow>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handleLogin = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); clearMessages();
    const res = await onLogin(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error || "Login failed");
  };

  const handleRegister = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); clearMessages();
    const res = await onRegister(email, password, { displayName: displayName || undefined });
    setLoading(false);
    if (!res.ok) { setError(res.error || "Registration failed"); return; }
    if (res.needsVerification) {
      setSuccess("Account created! Check your email for a verification code.");
      setFlow("verify");
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) { setError("Enter the 6-digit code from your email"); return; }
    setLoading(true); clearMessages();
    const res = await onVerifyEmail(code);
    setLoading(false);
    if (res.ok) setSuccess("Email verified! You're all set.");
    else setError(res.error || "Invalid code");
  };

  const handleForgot = async () => {
    if (!email) { setError("Enter your email address"); return; }
    setLoading(true); clearMessages();
    const res = await onForgotPassword(email);
    setLoading(false);
    setSuccess(res.message || "If that email is registered, a reset code has been sent.");
    setFlow("reset");
  };

  const handleReset = async () => {
    if (!code || !newPassword) { setError("Enter the code and your new password"); return; }
    setLoading(true); clearMessages();
    const res = await onResetPassword(email, code, newPassword);
    setLoading(false);
    if (res.ok) setSuccess("Password reset! You're now logged in.");
    else setError(res.error || "Reset failed");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-sm mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow">
            {flow === "verify" ? (
              <ShieldCheck size={24} className="text-white" />
            ) : flow === "forgot" || flow === "reset" ? (
              <KeyRound size={24} className="text-white" />
            ) : (
              <User2 size={24} className="text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-ink-base tracking-tight mb-1">
            {flow === "login" && "Welcome back"}
            {flow === "register" && "Create your account"}
            {flow === "verify" && "Verify your email"}
            {flow === "forgot" && "Forgot password"}
            {flow === "reset" && "Reset password"}
          </h2>
          <p className="text-sm text-ink-muted">
            {flow === "login" && "Log in to sync your health data across devices"}
            {flow === "register" && "Free forever. Your data stays private."}
            {flow === "verify" && "Enter the 6-digit code we sent to your email"}
            {flow === "forgot" && "We'll send a reset code to your email"}
            {flow === "reset" && "Enter the code from your email and your new password"}
          </p>
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger-500 bg-danger-500/10 border border-danger-500/30 rounded-xl px-3 py-2.5 mb-4">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-success-600 bg-success-500/10 border border-success-500/30 rounded-xl px-3 py-2.5 mb-4">
            <CheckCircle size={14} className="flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* === LOGIN === */}
          {flow === "login" && (
            <>
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="your@email.com" label="Email" autoComplete="email" />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Your password" label="Password" autoComplete="current-password" onEnter={handleLogin} />
              <PrimaryButton loading={loading} onClick={handleLogin} label="Log in" />
              <div className="flex items-center justify-between text-sm">
                <button onClick={() => { setFlow("register"); clearMessages(); }} className="text-brand-500 hover:text-brand-600 font-semibold">
                  Create account
                </button>
                <button onClick={() => { setFlow("forgot"); clearMessages(); }} className="text-ink-muted hover:text-ink-base font-medium">
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {/* === REGISTER === */}
          {flow === "register" && (
            <>
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="your@email.com" label="Email" autoComplete="email" />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" label="Password" autoComplete="new-password" />
              <Field icon={User2} type="text" value={displayName} onChange={setDisplayName} placeholder="Optional" label="Display name (optional)" autoComplete="name" onEnter={handleRegister} />
              <PrimaryButton loading={loading} onClick={handleRegister} label="Create account" />
              <BackLink onClick={() => { setFlow("login"); clearMessages(); }} label="Already have an account? Log in" />
            </>
          )}

          {/* === VERIFY EMAIL === */}
          {flow === "verify" && (
            <>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
              <PrimaryButton loading={loading} onClick={handleVerify} label="Verify email" />
              <div className="text-center">
                <button onClick={onResendVerification} className="text-sm text-brand-500 hover:text-brand-600 font-semibold">
                  Resend code
                </button>
              </div>
              <BackLink onClick={() => { setFlow("login"); clearMessages(); }} label="Skip for now" />
            </>
          )}

          {/* === FORGOT PASSWORD === */}
          {flow === "forgot" && (
            <>
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="your@email.com" label="Email" autoComplete="email" onEnter={handleForgot} />
              <PrimaryButton loading={loading} onClick={handleForgot} label="Send reset code" />
              <BackLink onClick={() => { setFlow("login"); clearMessages(); }} label="Back to login" />
            </>
          )}

          {/* === RESET PASSWORD === */}
          {flow === "reset" && (
            <>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Reset code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <Field icon={Lock} type="password" value={newPassword} onChange={setNewPassword} placeholder="New password (min. 6)" label="New password" autoComplete="new-password" onEnter={handleReset} />
              <PrimaryButton loading={loading} onClick={handleReset} label="Reset password" />
              <BackLink onClick={() => { setFlow("login"); clearMessages(); }} label="Back to login" />
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-subtle mt-8">
          Account is optional. MedOS works fully without login.
          <br />
          Creating an account syncs health data across devices.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  label,
  autoComplete,
  onEnter,
}: {
  icon: any;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  autoComplete?: string;
  onEnter?: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        />
      </div>
    </div>
  );
}

function PrimaryButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? "..." : label}
      {!loading && <ArrowRight size={16} />}
    </button>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="text-center">
      <button onClick={onClick} className="text-sm text-brand-500 hover:text-brand-600 font-semibold inline-flex items-center gap-1">
        <ArrowLeft size={14} />
        {label}
      </button>
    </div>
  );
}

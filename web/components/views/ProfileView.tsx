"use client";

import { useState } from "react";
import {
  User2,
  LogOut,
  Download,
  Shield,
  Calendar,
  Pill,
  Activity,
  FileText,
  Printer,
  ClipboardList,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";
import type { User } from "@/lib/hooks/useAuth";

interface ProfileViewProps {
  user: User;
  onLogout: () => void;
  onExport: () => void;
  onOpenEHR: () => void;
  /**
   * Self-service account deletion. Wired to useAuth.deleteMe which
   * calls DELETE /api/auth/me with the user's current password +
   * email confirmation. On success the parent navigates away (the
   * session is already invalidated server-side and the auth state
   * cleared locally). On failure the API's error message is shown
   * inline — typically "Password is incorrect" or "Too many
   * deletion attempts. Try again later." (3/hour rate limit).
   */
  onDeleteAccount: (
    password: string,
    confirmEmail: string,
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  medicationCount: number;
  appointmentCount: number;
  vitalCount: number;
  recordCount: number;
  language: SupportedLanguage;
}

export function ProfileView({
  user,
  onLogout,
  onExport,
  onOpenEHR,
  onDeleteAccount,
  medicationCount,
  appointmentCount,
  vitalCount,
  recordCount,
  language,
}: ProfileViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-gradient flex items-center justify-center shadow-glow">
            <User2 size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-ink-base tracking-tight">
            {user.displayName || user.email}
          </h2>
          <p className="text-sm text-ink-muted mt-1">{user.email}</p>
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 text-xs text-success-500 mt-1">
              <Shield size={10} /> Email verified
            </span>
          ) : (
            <span className="text-xs text-warning-500 mt-1">
              Email not verified
            </span>
          )}
        </div>

        {/* Health summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Pill} label={t("nav_medications", language)} value={medicationCount} />
          <StatCard icon={Calendar} label={t("nav_appointments", language)} value={appointmentCount} />
          <StatCard icon={Activity} label={t("nav_vitals", language)} value={vitalCount} />
          <StatCard icon={FileText} label={t("nav_records", language)} value={recordCount} />
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={onOpenEHR}
            className="w-full flex items-center gap-3 p-4 bg-surface-1 border border-line/60 rounded-2xl shadow-soft text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <ClipboardList size={18} className="text-accent-500" />
            </div>
            <div>
              <span className="font-bold text-sm text-ink-base block">
                Health Profile (EHR)
              </span>
              <span className="text-xs text-ink-muted">
                Set up your medical history for personalized AI advice
              </span>
            </div>
          </button>

          <button
            onClick={onExport}
            className="w-full flex items-center gap-3 p-4 bg-surface-1 border border-line/60 rounded-2xl shadow-soft text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Download size={18} className="text-brand-500" />
            </div>
            <div>
              <span className="font-bold text-sm text-ink-base block">
                Export health data (JSON)
              </span>
              <span className="text-xs text-ink-muted">
                Download all your data as a file
              </span>
            </div>
          </button>

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 p-4 bg-surface-1 border border-line/60 rounded-2xl shadow-soft text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Printer size={18} className="text-accent-500" />
            </div>
            <div>
              <span className="font-bold text-sm text-ink-base block">
                Print health report
              </span>
              <span className="text-xs text-ink-muted">
                PDF-friendly printable page for your doctor
              </span>
            </div>
          </button>
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-3 p-4 bg-surface-2/50 border border-line/40 rounded-2xl mb-8">
          <Shield size={18} className="text-accent-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink-base">Your data is yours</p>
            <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
              Health data is stored locally in your browser and synced to your
              private account on our server. No third parties. No ads. You can
              export or delete everything at any time.
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-3 border-2 border-danger-500/40 text-danger-500 rounded-xl font-bold text-sm hover:bg-danger-500/10 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Log out
        </button>

        <p className="text-center text-[11px] text-ink-subtle mt-4">
          Member since{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "recently"}
        </p>

        {/*
         * Danger zone — self-service account deletion (GDPR Art. 17).
         *
         * Intentionally placed below the privacy note + logout, behind
         * an extra click, and rendered in muted danger styling rather
         * than a primary CTA. The submit step requires the user to
         * RE-TYPE both their email and current password — these are
         * also enforced server-side; the client copy is just to make
         * accidental clicks harder.
         *
         * Admins cannot self-delete from this UI: the backend returns
         * 403 for is_admin users, and we hide the trigger button up
         * front so admins don't get an "error" experience for a
         * deliberate restriction.
         */}
        {!user.isAdmin && (
          <DangerZone email={user.email} onDeleteAccount={onDeleteAccount} />
        )}
      </div>
    </div>
  );
}

function DangerZone({
  email,
  onDeleteAccount,
}: {
  email: string;
  onDeleteAccount: ProfileViewProps["onDeleteAccount"];
}) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setConfirmEmail("");
    setPassword("");
    setError("");
  };

  const handleCancel = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!confirmEmail.trim() || !password) {
      setError("Type your email and current password to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await onDeleteAccount(password, confirmEmail.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Deletion failed");
      return;
    }
    // On success the auth hook has already wiped local state and the
    // parent (MedOSApp) navigates away — no further action needed here.
  };

  return (
    <div className="mt-10 pt-6 border-t border-danger-500/20">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-danger-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-danger-500">
          Danger zone
        </h3>
      </div>
      <p className="text-xs text-ink-muted mb-3 leading-relaxed">
        Permanently delete your account and all associated health data
        (medications, appointments, vitals, records, chat history, settings).
        This action cannot be undone.
      </p>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-danger-500 hover:text-danger-600 transition-colors"
        >
          <Trash2 size={14} />
          Delete my account
        </button>
      )}

      {open && (
        <div className="rounded-2xl border border-danger-500/40 bg-danger-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-danger-500">
            Are you sure? This is permanent.
          </p>

          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Re-type your email
            </span>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              autoComplete="off"
              className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger-500/30"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Current password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger-500/30"
            />
          </label>

          {error && (
            <p className="text-xs text-danger-500 font-semibold">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCancel}
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-surface-1 border border-line/60 text-ink-base text-sm font-bold hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-danger-500 text-white text-sm font-bold hover:bg-danger-600 transition-colors disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <div className="p-3 rounded-2xl bg-surface-1 border border-line/60 shadow-soft text-center">
      <Icon size={16} className="mx-auto text-brand-500 mb-1" />
      <div className="text-xl font-black text-ink-base">{value}</div>
      <div className="text-[11px] text-ink-muted font-semibold">{label}</div>
    </div>
  );
}

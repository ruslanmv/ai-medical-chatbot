"use client";

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
} from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";
import type { User } from "@/lib/hooks/useAuth";

interface ProfileViewProps {
  user: User;
  onLogout: () => void;
  onExport: () => void;
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
            {user.displayName || user.username}
          </h2>
          <p className="text-sm text-ink-muted mt-1">@{user.username}</p>
          {user.email && (
            <p className="text-xs text-ink-subtle mt-0.5">{user.email}</p>
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
      </div>
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

"use client";

import {
  Pill,
  Calendar,
  Activity,
  FileText,
  Heart,
  ChevronRight,
  Check,
  Flame,
  Clock,
  Download,
  MapPin,
} from "lucide-react";
import {
  VITAL_META,
  APPOINTMENT_TYPE_META,
  todayISO,
  type Medication,
  type Appointment,
  type VitalReading,
  type HealthRecord,
  type MedicationLog,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface HealthDashboardProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  appointments: Appointment[];
  vitals: VitalReading[];
  records: HealthRecord[];
  onNavigate: (view: string) => void;
  onMarkMedTaken: (medId: string, date: string, time: string) => void;
  isMedTaken: (medId: string, date: string, time: string) => boolean;
  getMedStreak: (medId: string) => number;
  onExport: () => void;
  language: SupportedLanguage;
}

export function HealthDashboard({
  medications,
  appointments,
  vitals,
  records,
  onNavigate,
  onMarkMedTaken,
  isMedTaken,
  getMedStreak,
  onExport,
  language,
}: HealthDashboardProps) {
  const today = todayISO();
  const activeMeds = medications.filter((m) => m.active);
  const upcomingAppts = appointments
    .filter((a) => a.status === "upcoming" && a.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const latestVitals = Object.keys(VITAL_META).map((type) => {
    const reading = vitals
      .filter((v) => v.type === type)
      .sort(
        (a, b) =>
          `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
      )[0];
    return { type, reading };
  }).filter((v) => v.reading);

  // How many meds are due today and how many are done
  const todayMedSlots = activeMeds.flatMap((m) =>
    m.times.map((time) => ({ med: m, time, taken: isMedTaken(m.id, today, time) })),
  );
  const medsDone = todayMedSlots.filter((s) => s.taken).length;
  const medsTotal = todayMedSlots.length;

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">{t("health_tracker", language)}</h2>
            <p className="text-sm text-ink-muted mt-1">
              Today&rsquo;s overview — {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-line/60 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink-base transition-colors"
            title={t("health_export_all", language)}
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Quick-stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <QuickStat
            icon={Pill}
            label={t("health_meds_today", language)}
            value={`${medsDone}/${medsTotal}`}
            onClick={() => onNavigate("medications")}
            accent={medsDone === medsTotal && medsTotal > 0 ? "success" : "brand"}
          />
          <QuickStat
            icon={Calendar}
            label={t("health_upcoming", language)}
            value={String(upcomingAppts.length)}
            onClick={() => onNavigate("appointments")}
            accent="brand"
          />
          <QuickStat
            icon={Activity}
            label={t("nav_vitals", language)}
            value={String(latestVitals.length)}
            onClick={() => onNavigate("vitals")}
            accent="accent"
          />
          <QuickStat
            icon={FileText}
            label={t("nav_records", language)}
            value={String(records.length)}
            onClick={() => onNavigate("records")}
            accent="brand"
          />
        </div>

        {/* Find Nearby — quick access for mobile users */}
        <button
          onClick={() => onNavigate("nearby")}
          className="w-full flex items-center gap-3 p-4 mb-6 bg-surface-1 border border-line/60 rounded-2xl shadow-soft hover:border-brand-500/40 transition-all active:scale-[0.98] text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-ink-base block">Find Nearby</span>
            <span className="text-xs text-ink-muted">Pharmacies and doctors near you</span>
          </div>
          <ChevronRight size={16} className="text-ink-subtle flex-shrink-0" />
        </button>

        {/* Today's medications */}
        {todayMedSlots.length > 0 && (
          <DashSection
            title={t("health_todays_meds", language)}
            icon={Pill}
            onMore={() => onNavigate("medications")}
          >
            <div className="space-y-2">
              {todayMedSlots.slice(0, 6).map(({ med, time, taken }) => {
                const streak = getMedStreak(med.id);
                return (
                  <div
                    key={`${med.id}-${time}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      taken
                        ? "bg-success-500/8 border-success-500/30"
                        : "bg-surface-1 border-line/60"
                    }`}
                  >
                    <button
                      onClick={() => !taken && onMarkMedTaken(med.id, today, time)}
                      disabled={taken}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        taken
                          ? "bg-success-500 text-white"
                          : "bg-surface-2 border-2 border-line text-ink-subtle hover:border-brand-500"
                      }`}
                    >
                      {taken && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm ${taken ? "text-ink-muted line-through" : "text-ink-base"}`}>
                        {med.name}
                      </span>
                      <span className="text-xs text-ink-muted ml-2">
                        {med.dose} · {time}
                      </span>
                    </div>
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-warning-500">
                        <Flame size={11} /> {streak}d
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </DashSection>
        )}

        {/* Upcoming appointments */}
        {upcomingAppts.length > 0 && (
          <DashSection
            title={t("health_upcoming_appts", language)}
            icon={Calendar}
            onMore={() => onNavigate("appointments")}
          >
            <div className="space-y-2">
              {upcomingAppts.slice(0, 3).map((a) => {
                const meta = APPOINTMENT_TYPE_META[a.type];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-line/60"
                  >
                    <span className="text-lg">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-ink-base block truncate">
                        {a.title}
                      </span>
                      <span className="text-xs text-ink-muted flex items-center gap-2">
                        <Clock size={10} />
                        {new Date(a.date).toLocaleDateString()} · {a.time}
                        {a.doctor && ` · ${a.doctor}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashSection>
        )}

        {/* Latest vitals */}
        {latestVitals.length > 0 && (
          <DashSection
            title={t("health_latest_vitals", language)}
            icon={Activity}
            onMore={() => onNavigate("vitals")}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {latestVitals.slice(0, 6).map(({ type, reading }) => {
                const meta = VITAL_META[type as keyof typeof VITAL_META];
                return (
                  <div
                    key={type}
                    className="p-3 rounded-xl bg-surface-1 border border-line/60"
                  >
                    <span className="text-xs text-ink-subtle">{meta.emoji} {meta.label}</span>
                    <div className="text-lg font-black text-ink-base mt-0.5">
                      {reading!.value}
                      <span className="text-xs text-ink-muted font-normal ml-1">{meta.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashSection>
        )}

        {/* Empty state */}
        {todayMedSlots.length === 0 &&
          upcomingAppts.length === 0 &&
          latestVitals.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow">
                <Heart size={28} className="text-white" />
              </div>
              <h3 className="font-bold text-ink-base text-lg mb-2">
                {t("health_start_tracking", language)}
              </h3>
              <p className="text-ink-muted text-sm max-w-md mx-auto mb-6">
                Add your medications, appointments, and vital signs. Everything stays
                private in your browser — no account needed.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <NavButton label={t("health_add_med", language)} onClick={() => onNavigate("medications")} />
                <NavButton label={t("health_schedule_appt", language)} onClick={() => onNavigate("appointments")} />
                <NavButton label={t("health_log_vitals", language)} onClick={() => onNavigate("vitals")} />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  onClick,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  onClick: () => void;
  accent: "brand" | "success" | "accent";
}) {
  const colors = {
    brand: "text-brand-500",
    success: "text-success-500",
    accent: "text-accent-500",
  };
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-2xl bg-surface-1 border border-line/60 shadow-soft text-left hover:border-brand-500/40 hover:-translate-y-0.5 transition-all"
    >
      <Icon size={16} className={`${colors[accent]} mb-1`} />
      <div className="text-xl font-black text-ink-base">{value}</div>
      <div className="text-[11px] text-ink-muted font-semibold">{label}</div>
    </button>
  );
}

function DashSection({
  title,
  icon: Icon,
  onMore,
  children,
}: {
  title: string;
  icon: any;
  onMore: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
          <Icon size={14} />
          {title}
        </h3>
        <button
          onClick={onMore}
          className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-0.5 transition-colors"
        >
          See all <ChevronRight size={12} />
        </button>
      </div>
      {children}
    </section>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-surface-1 border border-line/60 text-sm font-semibold text-ink-muted hover:text-brand-600 hover:border-brand-500/50 transition-all"
    >
      {label}
    </button>
  );
}

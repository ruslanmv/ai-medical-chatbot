"use client";

import {
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Wind,
  Scale,
  Phone,
  Calendar,
  ChevronRight,
  Shield,
  Check,
  Circle,
  Bell,
} from "lucide-react";
import {
  VITAL_META,
  todayISO,
  type VitalReading,
  type Medication,
  type Appointment,
  type VitalType,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface RightPanelProps {
  language?: SupportedLanguage;
  emergencyNumber?: string;
  // Health data for the Vitals Today + Upcoming sections
  vitals?: VitalReading[];
  medications?: Medication[];
  appointments?: Appointment[];
  isMedTaken?: (medId: string, date: string, time: string) => boolean;
  onNavigate?: (view: string) => void;
  // Notification count
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

const VITAL_ICONS: Record<VitalType, any> = {
  "heart-rate": Heart,
  "blood-pressure": Activity,
  "oxygen-saturation": Wind,
  temperature: Thermometer,
  weight: Scale,
  "blood-glucose": Droplets,
};

const VITAL_COLORS: Record<VitalType, { bg: string; text: string; border: string }> = {
  "heart-rate": {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-700/40",
  },
  "blood-pressure": {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-700/40",
  },
  "oxygen-saturation": {
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-700/40",
  },
  temperature: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-700/40",
  },
  weight: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-700/40",
  },
  "blood-glucose": {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-700/40",
  },
};

function getStatus(type: VitalType, value: string): string {
  // Simple heuristic — not medical advice
  const num = parseFloat(value.split("/")[0]);
  if (isNaN(num)) return "";
  switch (type) {
    case "heart-rate":
      return num >= 60 && num <= 100 ? "Normal (60-100)" : num < 60 ? "Low" : "High";
    case "oxygen-saturation":
      return num >= 95 ? "Excellent" : num >= 90 ? "Fair" : "Low";
    case "temperature":
      return num >= 36.1 && num <= 37.2 ? "Stable" : num > 37.2 ? "Elevated" : "Low";
    case "blood-pressure":
      return num < 120 ? "Normal" : num < 140 ? "Elevated" : "High";
    default:
      return "";
  }
}

export function RightPanel({
  language = "en",
  emergencyNumber = "911",
  vitals = [],
  medications = [],
  appointments = [],
  isMedTaken,
  onNavigate,
  notificationCount = 0,
  onOpenNotifications,
}: RightPanelProps) {
  const today = todayISO();

  // Latest reading per vital type.
  const latestVitals = (Object.keys(VITAL_META) as VitalType[])
    .map((type) => {
      const reading = vitals
        .filter((v) => v.type === type)
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0];
      return { type, reading };
    })
    .filter((v) => v.reading);

  // Today's upcoming events (meds + appointments).
  const upcoming: Array<{
    id: string;
    title: string;
    time: string;
    type: string;
    done: boolean;
  }> = [];

  for (const med of medications.filter((m) => m.active)) {
    for (const time of med.times) {
      const done = isMedTaken?.(med.id, today, time) ?? false;
      upcoming.push({
        id: `med-${med.id}-${time}`,
        title: `${med.name} (${med.dose})`,
        time,
        type: "medication",
        done,
      });
    }
  }

  for (const appt of appointments.filter(
    (a) => a.date === today && a.status !== "cancelled",
  )) {
    upcoming.push({
      id: `appt-${appt.id}`,
      title: appt.title,
      time: appt.time,
      type: appt.type,
      done: appt.status === "completed",
    });
  }

  upcoming.sort((a, b) => a.time.localeCompare(b.time));

  const hasHealthData = latestVitals.length > 0 || upcoming.length > 0;

  return (
    <div className="hidden lg:flex w-72 bg-surface-1/50 backdrop-blur-xl border-l border-line/40 flex-col z-20 overflow-y-auto">
      <div className="p-5 flex-1 flex flex-col gap-5">
        {/* Vitals Today — only if there are readings */}
        {latestVitals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                <Activity size={13} />
                Vitals Today
              </h3>
              <button
                onClick={() => onNavigate?.("vitals")}
                className="text-[10px] font-semibold text-brand-500 hover:text-brand-600"
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {latestVitals.slice(0, 3).map(({ type, reading }) => {
                const meta = VITAL_META[type];
                const colors = VITAL_COLORS[type];
                const Icon = VITAL_ICONS[type];
                const status = getStatus(type, reading!.value);
                return (
                  <div
                    key={type}
                    className={`rounded-2xl p-3.5 border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                        {meta.label}
                      </span>
                      <Icon size={16} className={colors.text} />
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className={`text-2xl font-black tracking-tight ${colors.text}`}>
                        {reading!.value}
                      </span>
                      <span className="text-xs text-ink-muted mb-0.5">{meta.unit}</span>
                    </div>
                    {status && (
                      <span className={`text-[10px] font-semibold ${colors.text} mt-0.5 block`}>
                        {status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming — meds + appointments for today */}
        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                <Calendar size={13} />
                Upcoming
              </h3>
              <button
                onClick={() => onNavigate?.("schedule")}
                className="text-[10px] font-semibold text-brand-500 hover:text-brand-600"
              >
                View all
              </button>
            </div>
            <div className="space-y-1.5">
              {upcoming.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 py-2 px-1"
                >
                  {item.done ? (
                    <div className="w-5 h-5 rounded-full bg-success-500 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <Circle size={20} className="text-ink-subtle flex-shrink-0" strokeWidth={1.5} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium block truncate ${
                        item.done ? "line-through text-ink-muted" : "text-ink-base"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-ink-subtle">
                      {item.time} · {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — encourage setup */}
        {!hasHealthData && (
          <div className="text-center py-8">
            <Activity size={24} className="mx-auto text-ink-subtle mb-2" />
            <p className="text-xs text-ink-muted mb-3">
              Track your vitals and medications to see them here
            </p>
            <button
              onClick={() => onNavigate?.("health-dashboard")}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600"
            >
              Get started <ChevronRight size={12} className="inline" />
            </button>
          </div>
        )}

        {/* Privacy + emergency — always at bottom */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-subtle px-1">
            <Shield size={12} className="text-accent-500 flex-shrink-0" />
            {t("badge_private", language)} · {t("badge_free", language)}
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 border border-red-200 dark:border-red-700/40">
            <a
              href={`tel:${emergencyNumber}`}
              className="w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={13} />
              {t("emergency_call", language)} {emergencyNumber}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

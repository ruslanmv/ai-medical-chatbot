"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Check,
  Pill,
  Video,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  Droplets,
  Heart,
} from "lucide-react";
import {
  todayISO,
  FREQUENCY_LABELS,
  APPOINTMENT_TYPE_META,
  type Medication,
  type Appointment,
  type MedicationLog,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface ScheduleViewProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  appointments: Appointment[];
  onMarkMedTaken: (medId: string, date: string, time: string) => void;
  isMedTaken: (medId: string, date: string, time: string) => boolean;
  onEditAppointment: (id: string, patch: Partial<Appointment>) => void;
  onNavigate: (view: string) => void;
  language: SupportedLanguage;
}

interface TimelineEvent {
  id: string;
  time: string; // "HH:MM"
  title: string;
  subtitle: string;
  type: "medication" | "appointment" | "task" | "habit";
  done: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

function formatHour(h: number): string {
  if (h === 0 || h === 12) return `${h === 0 ? 12 : 12} ${h < 12 ? "AM" : "PM"}`;
  return `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function ScheduleView({
  medications,
  medicationLogs,
  appointments,
  onMarkMedTaken,
  isMedTaken,
  onEditAppointment,
  onNavigate,
  language,
}: ScheduleViewProps) {
  const today = todayISO();
  const [now, setNow] = useState(new Date());

  // Update "now" every minute for the live indicator.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Build the timeline events from medications + appointments.
  const events: TimelineEvent[] = useMemo(() => {
    const items: TimelineEvent[] = [];

    // Active medications → one event per scheduled time.
    for (const med of medications.filter((m) => m.active)) {
      for (const time of med.times) {
        const done = isMedTaken(med.id, today, time);
        items.push({
          id: `med-${med.id}-${time}`,
          time,
          title: `${med.name} (${med.dose})`,
          subtitle: `${time} · ${t("nav_medications", language)}`,
          type: "medication",
          done,
          onAction: done ? undefined : () => onMarkMedTaken(med.id, today, time),
          actionLabel: done ? undefined : t("appt_mark_done", language),
        });
      }
    }

    // Today's appointments.
    for (const appt of appointments.filter((a) => a.date === today)) {
      const done = appt.status === "completed";
      const meta = APPOINTMENT_TYPE_META[appt.type];
      items.push({
        id: `appt-${appt.id}`,
        time: appt.time,
        title: appt.title,
        subtitle: `${appt.time} · ${meta.label}${appt.doctor ? ` · ${appt.doctor}` : ""}`,
        type: "appointment",
        done,
        onAction: done ? undefined : () => onEditAppointment(appt.id, { status: "completed" }),
        actionLabel: done ? undefined : t("appt_mark_done", language),
      });
    }

    return items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [medications, appointments, today, isMedTaken, onMarkMedTaken, onEditAppointment, language]);

  // Position of the "Now" indicator as a percentage of the timeline.
  const timelineStart = HOURS[0] * 60;
  const timelineEnd = (HOURS[HOURS.length - 1] + 1) * 60;
  const nowPercent = Math.max(
    0,
    Math.min(100, ((nowMinutes - timelineStart) / (timelineEnd - timelineStart)) * 100),
  );

  const dayOfWeek = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">
              {t("health_tracker", language)}
            </h2>
            <p className="text-sm text-ink-muted mt-0.5">{dayOfWeek}</p>
          </div>
          <button
            onClick={() => onNavigate("medications")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
          >
            <Plus size={16} />
            {t("med_add", language)}
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Hour rows */}
          {HOURS.map((hour) => {
            const hourEvents = events.filter((e) => {
              const m = timeToMinutes(e.time);
              return m >= hour * 60 && m < (hour + 1) * 60;
            });

            return (
              <div key={hour} className="flex min-h-[72px] border-t border-line/40">
                {/* Hour label */}
                <div className="w-16 sm:w-20 flex-shrink-0 pt-2 pr-3 text-right">
                  <span className="text-xs font-semibold text-ink-subtle">
                    {formatHour(hour)}
                  </span>
                </div>

                {/* Event area */}
                <div className="flex-1 relative py-1.5 pl-3 space-y-1.5">
                  {hourEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* "Now" indicator line — only if within visible hours */}
          {nowMinutes >= timelineStart && nowMinutes <= timelineEnd && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{ top: `${nowPercent}%` }}
            >
              <div className="flex items-center">
                <div className="w-16 sm:w-20 flex-shrink-0 text-right pr-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-500">
                    <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
                    {nowLabel}
                  </span>
                </div>
                <div className="flex-1 h-px bg-danger-500" />
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {events.length === 0 && (
          <div className="text-center py-16">
            <Clock size={32} className="mx-auto text-ink-subtle mb-3" />
            <p className="font-bold text-ink-base text-lg mb-1">
              No events today
            </p>
            <p className="text-sm text-ink-muted mb-4">
              Add medications or appointments to see them on your timeline
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onNavigate("medications")}
                className="px-4 py-2 rounded-xl bg-surface-1 border border-line/60 text-sm font-semibold text-ink-muted hover:text-brand-600 hover:border-brand-500/50 transition-all"
              >
                {t("health_add_med", language)}
              </button>
              <button
                onClick={() => onNavigate("appointments")}
                className="px-4 py-2 rounded-xl bg-surface-1 border border-line/60 text-sm font-semibold text-ink-muted hover:text-brand-600 hover:border-brand-500/50 transition-all"
              >
                {t("health_schedule_appt", language)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const typeStyles: Record<string, string> = {
    medication: event.done
      ? "bg-success-500/8 border-success-500/30"
      : "bg-rose-50 dark:bg-rose-900/15 border-rose-200 dark:border-rose-700/40",
    appointment: "bg-purple-50 dark:bg-purple-900/15 border-purple-200 dark:border-purple-700/40",
    task: "bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-700/40",
    habit: "bg-sky-50 dark:bg-sky-900/15 border-sky-200 dark:border-sky-700/40",
  };

  const iconMap: Record<string, any> = {
    medication: Pill,
    appointment: Video,
    task: CheckCircle,
    habit: Droplets,
  };
  const Icon = iconMap[event.type] || Clock;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        typeStyles[event.type] || "bg-surface-1 border-line/60"
      } ${event.done ? "opacity-70" : ""}`}
    >
      <Icon
        size={16}
        className={
          event.done
            ? "text-success-500"
            : event.type === "medication"
            ? "text-rose-500"
            : event.type === "appointment"
            ? "text-purple-500"
            : "text-blue-500"
        }
      />
      <div className="flex-1 min-w-0">
        <span
          className={`font-semibold text-sm block ${
            event.done ? "line-through text-ink-muted" : "text-ink-base"
          }`}
        >
          {event.title}
        </span>
        <span className="text-xs text-ink-muted">{event.subtitle}</span>
      </div>
      {event.done ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-success-500">
          <Check size={14} strokeWidth={3} />
          Done
        </span>
      ) : event.onAction ? (
        <button
          onClick={event.onAction}
          className="px-3 py-1.5 border border-line/60 rounded-lg text-xs font-semibold text-ink-base hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-500/50 transition-all"
        >
          {event.actionLabel || "Mark Done"}
        </button>
      ) : null}
    </div>
  );
}

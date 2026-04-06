"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  X,
  Check,
  MapPin,
  User2,
  Trash2,
  ChevronDown,
  Clock,
} from "lucide-react";
import {
  APPOINTMENT_TYPE_META,
  todayISO,
  type Appointment,
  type AppointmentType,
  type AppointmentStatus,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface AppointmentsViewProps {
  appointments: Appointment[];
  onAdd: (appt: Omit<Appointment, "id">) => void;
  onEdit: (id: string, patch: Partial<Appointment>) => void;
  onDelete: (id: string) => void;
  language: SupportedLanguage;
}

export function AppointmentsView({
  appointments,
  onAdd,
  onEdit,
  onDelete,
  language,
}: AppointmentsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AppointmentType>("doctor");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [doctor, setDoctor] = useState("");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState<Appointment["recurring"] | "">("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

  const today = todayISO();

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      type,
      date,
      time,
      location: location.trim() || undefined,
      doctor: doctor.trim() || undefined,
      notes: notes.trim() || undefined,
      status: date >= today ? "upcoming" : "completed",
      recurring: recurring || undefined,
    });
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setType("doctor");
    setDate(todayISO());
    setTime("09:00");
    setLocation("");
    setDoctor("");
    setNotes("");
    setRecurring("");
    setShowForm(false);
  };

  const sorted = [...appointments].sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return db.localeCompare(da); // newest first
  });

  const filtered =
    filter === "all"
      ? sorted
      : sorted.filter((a) =>
          filter === "upcoming"
            ? a.status === "upcoming"
            : a.status === "completed",
        );

  const statusColor: Record<AppointmentStatus, string> = {
    upcoming:
      "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/30",
    completed:
      "bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/30",
    missed:
      "bg-danger-500/10 text-danger-600 dark:text-danger-500 border-danger-500/30",
    cancelled:
      "bg-surface-2 text-ink-muted border-line/60",
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">{t("appt_title", language)}</h2>
            <p className="text-sm text-ink-muted mt-1">
              {t("appt_subtitle", language)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? t("appt_cancel", language) : t("appt_add", language)}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-surface-1 border border-line/60 rounded-2xl p-5 mb-6 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-ink-base mb-4">{t("appt_new", language)}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cardiology checkup"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AppointmentType)}
                    className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {Object.entries(APPOINTMENT_TYPE_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.emoji} {v.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Recurring
                </label>
                <div className="relative">
                  <select
                    value={recurring}
                    onChange={(e) =>
                      setRecurring(
                        e.target.value as Appointment["recurring"] | "",
                      )
                    }
                    className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="">One-time</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Every 3 months</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Doctor (optional)
                </label>
                <input
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Location (optional)
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City Hospital"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bring previous lab results..."
                  rows={2}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="mt-4 w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              Save Appointment
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "upcoming", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-surface-2 text-ink-muted hover:text-ink-base"
              }`}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "Completed"}
            </button>
          ))}
        </div>

        {/* Empty */}
        {filtered.length === 0 && !showForm && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gradient-soft flex items-center justify-center">
              <Calendar size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-1">
              {t("appt_none", language)}
            </h3>
            <p className="text-ink-muted text-sm">
              {t("appt_none_desc", language)}
            </p>
          </div>
        )}

        {/* Appointment list */}
        <div className="space-y-3">
          {filtered.map((a) => {
            const meta = APPOINTMENT_TYPE_META[a.type];
            return (
              <div
                key={a.id}
                className="bg-surface-1 border border-line/60 rounded-2xl p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-gradient-soft flex items-center justify-center text-lg flex-shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-ink-base text-sm">
                        {a.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor[a.status]}`}
                      >
                        {a.status}
                      </span>
                      {a.recurring && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-500 bg-accent-500/10 border border-accent-500/30 px-2 py-0.5 rounded-full">
                          {a.recurring}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(a.date).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {a.time}
                      </span>
                      {a.doctor && (
                        <span className="inline-flex items-center gap-1">
                          <User2 size={11} />
                          {a.doctor}
                        </span>
                      )}
                      {a.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {a.location}
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-ink-subtle mt-1.5 leading-relaxed">
                        {a.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {a.status === "upcoming" && (
                      <button
                        onClick={() =>
                          onEdit(a.id, { status: "completed" })
                        }
                        className="p-1.5 rounded-lg text-ink-subtle hover:text-success-500 hover:bg-success-500/10 transition-colors"
                        title="Mark completed"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(a.id)}
                      className="p-1.5 rounded-lg text-ink-subtle hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

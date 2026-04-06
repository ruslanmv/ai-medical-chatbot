"use client";

import { useState } from "react";
import {
  Pill,
  Plus,
  X,
  Check,
  Flame,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  FREQUENCY_LABELS,
  todayISO,
  type Medication,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface MedicationsViewProps {
  medications: Medication[];
  onAdd: (med: Omit<Medication, "id">) => void;
  onEdit: (id: string, patch: Partial<Medication>) => void;
  onDelete: (id: string) => void;
  onMarkTaken: (medId: string, date: string, time: string) => void;
  isTaken: (medId: string, date: string, time: string) => boolean;
  getStreak: (medId: string) => number;
  language: SupportedLanguage;
}

const TIME_GROUPS = [
  { label: "Morning", range: ["05:00", "12:00"] },
  { label: "Afternoon", range: ["12:00", "18:00"] },
  { label: "Evening", range: ["18:00", "23:59"] },
] as const;

export function MedicationsView({
  medications,
  onAdd,
  onDelete,
  onMarkTaken,
  isTaken,
  getStreak,
  language,
}: MedicationsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState<Medication["frequency"]>("daily");
  const [times, setTimes] = useState<string[]>(["08:00"]);

  const today = todayISO();
  const active = medications.filter((m) => m.active);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      dose: dose.trim(),
      frequency,
      times,
      startDate: today,
      active: true,
    });
    setName("");
    setDose("");
    setFrequency("daily");
    setTimes(["08:00"]);
    setShowForm(false);
  };

  const grouped = TIME_GROUPS.map((g) => ({
    ...g,
    meds: active.filter((m) =>
      m.times.some((t) => t >= g.range[0] && t < g.range[1]),
    ),
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">Medications</h2>
            <p className="text-sm text-ink-muted mt-1">
              Track your daily medications and build a streak
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add"}
          </button>
        </div>

        {/* Add medication form */}
        {showForm && (
          <div className="bg-surface-1 border border-line/60 rounded-2xl p-5 mb-6 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-ink-base mb-4">New Medication</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metformin"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Dose
                </label>
                <input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 500mg"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Frequency
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as Medication["frequency"])
                    }
                    className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
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
                  Time(s)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {times.map((t, i) => (
                    <input
                      key={i}
                      type="time"
                      value={t}
                      onChange={(e) => {
                        const next = [...times];
                        next[i] = e.target.value;
                        setTimes(next);
                      }}
                      className="bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setTimes([...times, "12:00"])}
                    className="px-3 py-2.5 bg-surface-2 border border-line/60 rounded-xl text-ink-muted text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="mt-4 w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              Save Medication
            </button>
          </div>
        )}

        {/* Empty state */}
        {active.length === 0 && !showForm && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gradient-soft flex items-center justify-center">
              <Pill size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-1">
              No medications yet
            </h3>
            <p className="text-ink-muted text-sm">
              Tap &ldquo;Add&rdquo; to start tracking your medications
            </p>
          </div>
        )}

        {/* Time-grouped medication list */}
        {TIME_GROUPS.map((g) => {
          const meds = active.filter((m) =>
            m.times.some((t) => t >= g.range[0] && t < g.range[1]),
          );
          if (meds.length === 0) return null;
          return (
            <div key={g.label} className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-subtle mb-3">
                {g.label}
              </h3>
              <div className="space-y-2">
                {meds.map((m) => {
                  const medTimes = m.times.filter(
                    (t) => t >= g.range[0] && t < g.range[1],
                  );
                  return medTimes.map((time) => {
                    const taken = isTaken(m.id, today, time);
                    const streak = getStreak(m.id);
                    return (
                      <div
                        key={`${m.id}-${time}`}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          taken
                            ? "bg-success-500/8 border-success-500/30"
                            : "bg-surface-1 border-line/60 shadow-soft"
                        }`}
                      >
                        <button
                          onClick={() =>
                            !taken && onMarkTaken(m.id, today, time)
                          }
                          disabled={taken}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            taken
                              ? "bg-success-500 text-white"
                              : "bg-surface-2 border-2 border-line text-ink-subtle hover:border-brand-500 hover:text-brand-500"
                          }`}
                        >
                          {taken ? (
                            <Check size={18} strokeWidth={3} />
                          ) : (
                            <Pill size={16} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`font-bold text-sm block ${
                              taken
                                ? "text-ink-muted line-through"
                                : "text-ink-base"
                            }`}
                          >
                            {m.name}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {m.dose} · {time}
                          </span>
                        </div>
                        {streak > 0 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-warning-500">
                            <Flame size={12} />
                            {streak}d
                          </span>
                        )}
                        <button
                          onClick={() => onDelete(m.id)}
                          className="text-ink-subtle hover:text-danger-500 transition-colors p-1"
                          title="Delete medication"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

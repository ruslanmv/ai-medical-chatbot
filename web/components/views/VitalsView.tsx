"use client";

import { useState } from "react";
import {
  Activity,
  Plus,
  X,
  Trash2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  VITAL_META,
  todayISO,
  nowTimeISO,
  type VitalReading,
  type VitalType,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface VitalsViewProps {
  vitals: VitalReading[];
  onAdd: (reading: Omit<VitalReading, "id">) => void;
  onDelete: (id: string) => void;
  language: SupportedLanguage;
}

export function VitalsView({
  vitals,
  onAdd,
  onDelete,
  language,
}: VitalsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<VitalType>("blood-pressure");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTimeISO());
  const [notes, setNotes] = useState("");

  const meta = VITAL_META[type];

  const handleSubmit = () => {
    if (!value.trim()) return;
    onAdd({
      type,
      value: value.trim(),
      unit: meta.unit,
      date,
      time,
      notes: notes.trim() || undefined,
    });
    setValue("");
    setNotes("");
    setShowForm(false);
  };

  // Group vitals by type and show the latest reading + a mini sparkline.
  const grouped = Object.keys(VITAL_META) as VitalType[];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">Vitals</h2>
            <p className="text-sm text-ink-muted mt-1">
              Log blood pressure, glucose, weight, temperature, and more
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Log"}
          </button>
        </div>

        {/* Quick-entry form */}
        {showForm && (
          <div className="bg-surface-1 border border-line/60 rounded-2xl p-5 mb-6 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-ink-base mb-4">Log a reading</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Vital type
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as VitalType);
                      setValue("");
                    }}
                    className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {Object.entries(VITAL_META).map(([k, v]) => (
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
                  Value ({meta.unit})
                </label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={meta.placeholder}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
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
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Notes (optional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="After breakfast, resting..."
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="mt-4 w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              Save Reading
            </button>
          </div>
        )}

        {/* Summary cards per vital type */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {grouped.map((vType) => {
            const vMeta = VITAL_META[vType];
            const readings = vitals
              .filter((v) => v.type === vType)
              .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
            const latest = readings[0];
            const prev = readings[1];
            const trend = !latest || !prev ? null : getTrend(vType, latest, prev);

            return (
              <button
                key={vType}
                onClick={() => {
                  setType(vType);
                  setShowForm(true);
                }}
                className="p-4 rounded-2xl bg-surface-1 border border-line/60 shadow-soft text-left hover:border-brand-500/40 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{vMeta.emoji}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                    {vMeta.label}
                  </span>
                </div>
                {latest ? (
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-ink-base tracking-tight">
                      {latest.value}
                    </span>
                    <span className="text-xs text-ink-muted mb-1">
                      {vMeta.unit}
                    </span>
                    {trend && (
                      <span
                        className={`ml-auto text-xs font-bold flex items-center gap-0.5 ${
                          trend === "up"
                            ? "text-danger-500"
                            : trend === "down"
                            ? "text-success-500"
                            : "text-ink-subtle"
                        }`}
                      >
                        {trend === "up" ? (
                          <TrendingUp size={12} />
                        ) : trend === "down" ? (
                          <TrendingDown size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-ink-subtle">No readings yet</span>
                )}
                {/* Mini sparkline — last 7 readings as bars */}
                {readings.length > 1 && (
                  <div className="flex items-end gap-0.5 mt-2 h-6">
                    {readings
                      .slice(0, 7)
                      .reverse()
                      .map((r, i) => {
                        const num = parseFloat(r.value.split("/")[0]);
                        if (isNaN(num)) return null;
                        const all = readings.slice(0, 7).map((rr) =>
                          parseFloat(rr.value.split("/")[0]),
                        );
                        const min = Math.min(...all.filter((n) => !isNaN(n)));
                        const max = Math.max(...all.filter((n) => !isNaN(n)));
                        const range = max - min || 1;
                        const h = 4 + ((num - min) / range) * 20;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-brand-500/40 rounded-sm"
                            style={{ height: `${h}px` }}
                          />
                        );
                      })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Full reading history */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-subtle mb-3">
          Recent readings
        </h3>
        {vitals.length === 0 ? (
          <div className="text-center py-10">
            <Activity size={28} className="mx-auto text-ink-subtle mb-2" />
            <p className="text-sm text-ink-muted">
              No readings yet. Tap a vital type above or &ldquo;Log&rdquo; to
              start.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...vitals]
              .sort(
                (a, b) =>
                  `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
              )
              .slice(0, 30)
              .map((v) => {
                const vMeta = VITAL_META[v.type];
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-line/60"
                  >
                    <span className="text-lg">{vMeta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm text-ink-base">
                        {vMeta.label}:{" "}
                        <span className="text-brand-600 dark:text-brand-400">
                          {v.value} {v.unit}
                        </span>
                      </span>
                      <span className="text-xs text-ink-muted block">
                        {new Date(v.date).toLocaleDateString()} · {v.time}
                        {v.notes ? ` — ${v.notes}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="text-ink-subtle hover:text-danger-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTrend(
  _type: VitalType,
  latest: VitalReading,
  prev: VitalReading,
): "up" | "down" | "stable" {
  const a = parseFloat(latest.value.split("/")[0]);
  const b = parseFloat(prev.value.split("/")[0]);
  if (isNaN(a) || isNaN(b)) return "stable";
  const diff = a - b;
  if (Math.abs(diff) < 1) return "stable";
  return diff > 0 ? "up" : "down";
}

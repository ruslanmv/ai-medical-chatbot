"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  X,
  Trash2,
  ChevronDown,
  Search,
  Shield,
  Download,
} from "lucide-react";
import { todayISO, type HealthRecord, type RecordType } from "@/lib/health-store";
import { type SupportedLanguage } from "@/lib/i18n";

const RECORD_TYPES: Record<RecordType, { label: string; emoji: string }> = {
  "lab-report": { label: "Lab Report", emoji: "🧪" },
  "clinical-note": { label: "Clinical Note", emoji: "📋" },
  prescription: { label: "Prescription", emoji: "💊" },
  certificate: { label: "Certificate", emoji: "📄" },
  imaging: { label: "Imaging / X-Ray", emoji: "🔬" },
  other: { label: "Other", emoji: "📌" },
};

interface RecordsViewProps {
  records: HealthRecord[];
  onAdd: (rec: Omit<HealthRecord, "id">) => void;
  onEdit: (id: string, patch: Partial<HealthRecord>) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  language: SupportedLanguage;
}

export function RecordsView({
  records,
  onAdd,
  onDelete,
  onExport,
}: RecordsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<RecordType>("lab-report");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      type,
      date,
      notes: notes.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setTitle("");
    setNotes("");
    setTags("");
    setShowForm(false);
  };

  const filtered = search
    ? records.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.notes?.toLowerCase().includes(search.toLowerCase()) ||
          r.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
      )
    : records;

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">Health Records</h2>
            <p className="text-sm text-ink-muted mt-1">
              Lab results, prescriptions, clinical notes
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-surface-2 border border-line/60 text-ink-muted rounded-xl text-sm font-semibold hover:text-ink-base transition-colors"
              title="Export all health data"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Cancel" : "Add"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-surface-1 border border-line/60 rounded-2xl p-5 mb-6 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-ink-base mb-4">New Record</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood work results — March 2026"
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
                    onChange={(e) => setType(e.target.value as RecordType)}
                    className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {Object.entries(RECORD_TYPES).map(([k, v]) => (
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
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key results, doctor comments..."
                  rows={3}
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
                  Tags (comma-separated)
                </label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. cardiology, annual, cholesterol"
                  className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="mt-4 w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              Save Record
            </button>
          </div>
        )}

        {/* Empty state */}
        {sorted.length === 0 && !showForm && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gradient-soft flex items-center justify-center">
              <FileText size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-1">
              No records yet
            </h3>
            <p className="text-ink-muted text-sm">
              Add lab results, prescriptions, and clinical notes
            </p>
          </div>
        )}

        {/* Record cards */}
        <div className="space-y-2">
          {sorted.map((r) => {
            const meta = RECORD_TYPES[r.type];
            return (
              <div
                key={r.id}
                className="bg-surface-1 border border-line/60 rounded-2xl p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-ink-base block">
                      {r.title}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {meta.label} · {new Date(r.date).toLocaleDateString()}
                    </span>
                    {r.notes && (
                      <p className="text-xs text-ink-subtle mt-1 leading-relaxed line-clamp-2">
                        {r.notes}
                      </p>
                    )}
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-surface-2 border border-line/60 text-ink-muted rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-ink-subtle hover:text-danger-500 p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-8 justify-center text-xs text-ink-subtle">
          <Shield size={12} className="text-accent-500" />
          Records are stored locally in your browser only. Nobody else can see them.
        </div>
      </div>
    </div>
  );
}

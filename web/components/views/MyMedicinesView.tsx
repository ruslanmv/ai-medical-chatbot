"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Package,
  AlertTriangle,
  Clock,
  Pill,
  Trash2,
  Edit3,
  CalendarPlus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Box,
  Camera,
  Loader2,
  CheckCircle2,
  ScanLine,
  Focus,
  Zap,
} from "lucide-react";
import { useMedicineScanner } from "@/lib/hooks/useMedicineScanner";
import {
  getMedicineStatus,
  getStockState,
  todayISO,
  type MedicineItem,
  type MedicineForm,
  type MedicineStatus,
  type StockState,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface MyMedicinesViewProps {
  medicines: MedicineItem[];
  onAdd: (med: Omit<MedicineItem, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<MedicineItem>) => void;
  onDelete: (id: string) => void;
  onAddToSchedule: (med: MedicineItem) => void;
  language: SupportedLanguage;
}

type FilterTab = "all" | "active" | "expiring" | "expired" | "low";

const FORM_OPTIONS: { value: MedicineForm; label: string }[] = [
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "syrup", label: "Syrup" },
  { value: "inhaler", label: "Inhaler" },
  { value: "injection", label: "Injection" },
  { value: "cream", label: "Cream / Ointment" },
  { value: "drops", label: "Drops" },
  { value: "patch", label: "Patch" },
  { value: "other", label: "Other" },
];

const CATEGORY_OPTIONS = [
  "Diabetes", "Pain Relief", "Cardiovascular", "Respiratory",
  "Antibiotic", "Supplement", "Mental Health", "Thyroid",
  "Gastrointestinal", "Allergy", "Other",
];

const STATUS_COLORS: Record<MedicineStatus, { bg: string; text: string; border: string; label: string }> = {
  active:   { bg: "bg-success-500/10", text: "text-success-600 dark:text-success-400", border: "border-success-500/30", label: "Active" },
  expiring: { bg: "bg-warning-500/10", text: "text-warning-600 dark:text-warning-500", border: "border-warning-500/30", label: "Expiring" },
  expired:  { bg: "bg-danger-500/10",  text: "text-danger-600 dark:text-danger-400",   border: "border-danger-500/30",  label: "Expired" },
  discontinued: { bg: "bg-surface-2", text: "text-ink-muted", border: "border-line/60", label: "Discontinued" },
};

const STOCK_COLORS: Record<StockState, { text: string; label: string }> = {
  ok:  { text: "text-success-500", label: "" },
  low: { text: "text-warning-500", label: "Low stock" },
  out: { text: "text-danger-500", label: "Out of stock" },
};

const FORM_EMOJI: Record<MedicineForm, string> = {
  tablet: "💊", capsule: "💊", syrup: "🧴", inhaler: "💨",
  injection: "💉", cream: "🧴", drops: "💧", patch: "🩹", other: "📦",
};

export function MyMedicinesView({
  medicines,
  onAdd,
  onUpdate,
  onDelete,
  onAddToSchedule,
  language,
}: MyMedicinesViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Medicine scanner
  const scanner = useMedicineScanner();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleOpenScanner = () => {
    scanner.reset();
    setCapturedImage(null);
    setShowScanner(true);
    // Small delay so modal renders before file picker opens
    setTimeout(() => cameraInputRef.current?.click(), 200);
  };

  const handleScanCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview of captured image
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    // Start scanning
    await scanner.scan(file);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleAddScanned = () => {
    if (scanner.result?.medicine) {
      onAdd(scanner.result.medicine);
      scanner.reset();
      setCapturedImage(null);
      setShowScanner(false);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setCapturedImage(null);
    scanner.reset();
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => { if (capturedImage) URL.revokeObjectURL(capturedImage); };
  }, [capturedImage]);

  // Filter + search
  const filtered = useMemo(() => {
    let items = medicines;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brandName?.toLowerCase().includes(q) ||
          m.activeIngredient?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q),
      );
    }
    if (filter !== "all") {
      items = items.filter((m) => {
        const status = getMedicineStatus(m);
        const stock = getStockState(m);
        if (filter === "active") return status === "active";
        if (filter === "expiring") return status === "expiring";
        if (filter === "expired") return status === "expired";
        if (filter === "low") return stock === "low" || stock === "out";
        return true;
      });
    }
    return items;
  }, [medicines, search, filter]);

  // AI insights
  const insights = useMemo(() => {
    const alerts: { type: "warning" | "danger" | "info"; message: string }[] = [];
    const expiring = medicines.filter((m) => getMedicineStatus(m) === "expiring");
    const expired = medicines.filter((m) => getMedicineStatus(m) === "expired");
    const lowStock = medicines.filter((m) => getStockState(m) === "low" || getStockState(m) === "out");
    if (expired.length > 0) alerts.push({ type: "danger", message: `${expired.length} medicine${expired.length > 1 ? "s" : ""} expired — dispose safely` });
    if (expiring.length > 0) alerts.push({ type: "warning", message: `${expiring.length} medicine${expiring.length > 1 ? "s" : ""} expiring within 30 days` });
    if (lowStock.length > 0) alerts.push({ type: "info", message: `${lowStock.length} medicine${lowStock.length > 1 ? "s" : ""} running low — consider refill` });
    return alerts;
  }, [medicines]);

  const selected = selectedId ? medicines.find((m) => m.id === selectedId) : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-mobile-nav scroll-touch">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-ink-base">My Medicines</h2>
              <p className="text-sm text-ink-muted mt-0.5">{medicines.length} items in your inventory</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanCapture}
                className="hidden"
              />
              {/* Scan button — prominent, mobile-first */}
              <button
                onClick={handleOpenScanner}
                disabled={scanner.scanning}
                className="group flex items-center gap-2 px-4 py-2.5 bg-surface-1 border-2 border-brand-500/30 text-brand-600 rounded-xl font-bold text-sm hover:border-brand-500/60 hover:bg-brand-500/5 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="relative">
                  <Camera size={18} className="transition-transform group-hover:scale-110" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                </div>
                <span className="hidden sm:inline">Scan Label</span>
                <span className="sm:hidden">Scan</span>
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines..."
                className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {(["all", "active", "expiring", "expired", "low"] as FilterTab[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f
                      ? "bg-brand-500 text-white"
                      : "bg-surface-2 text-ink-muted hover:text-ink-base"
                  }`}
                >
                  {f === "all" ? "All" : f === "low" ? "Low Stock" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="mb-5 rounded-2xl bg-surface-1 border border-line/60 p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">AI Insights</span>
              </div>
              <div className="space-y-1.5">
                {insights.map((a, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm ${
                    a.type === "danger" ? "text-danger-600 dark:text-danger-400" :
                    a.type === "warning" ? "text-warning-600 dark:text-warning-500" :
                    "text-brand-600 dark:text-brand-400"
                  }`}>
                    <AlertTriangle size={13} />
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medicine grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package size={32} className="mx-auto text-ink-subtle mb-3" />
              <h3 className="font-bold text-ink-base text-lg mb-1">
                {medicines.length === 0 ? "No medicines yet" : "No matches"}
              </h3>
              <p className="text-sm text-ink-muted">
                {medicines.length === 0
                  ? "Add your first medicine to start tracking"
                  : "Try a different search or filter"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((med) => {
                const status = getMedicineStatus(med);
                const stock = getStockState(med);
                const colors = STATUS_COLORS[status];
                const stockInfo = STOCK_COLORS[stock];
                const emoji = FORM_EMOJI[med.form] || "📦";
                return (
                  <button
                    key={med.id}
                    onClick={() => setSelectedId(med.id)}
                    className={`p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-card ${
                      selectedId === med.id
                        ? "border-brand-500 shadow-glow"
                        : `bg-surface-1 ${colors.border} shadow-soft`
                    }`}
                  >
                    <span className="text-2xl block mb-2">{emoji}</span>
                    <span className="font-bold text-sm text-ink-base block truncate">{med.name}</span>
                    <span className="text-xs text-ink-muted block">{med.dose}</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {colors.label}
                      </span>
                    </div>
                    {med.expiryDate && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-ink-subtle">
                        <Clock size={10} />
                        Exp: {new Date(med.expiryDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </div>
                    )}
                    {stock !== "ok" && (
                      <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${stockInfo.text}`}>
                        <AlertTriangle size={10} />
                        {stockInfo.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail side panel (desktop) */}
      {selected && (
        <DetailPanel
          med={selected}
          onClose={() => setSelectedId(null)}
          onDelete={() => { onDelete(selected.id); setSelectedId(null); }}
          onUpdate={(patch) => onUpdate(selected.id, patch)}
          onAddToSchedule={() => onAddToSchedule(selected)}
        />
      )}

      {/* Add form modal */}
      {showAddForm && (
        <AddMedicineModal
          onAdd={(med) => { onAdd(med); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* ============================================================
       * Medicine Scanner — full-screen modal with viewfinder
       * Industry pattern: document scanning (CamScanner, Google Lens)
       * ============================================================ */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-1 rounded-t-3xl sm:rounded-2xl shadow-card overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <ScanLine size={16} className="text-brand-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink-base">Medicine Scanner</h3>
                  <p className="text-[11px] text-ink-muted">AI-powered label recognition</p>
                </div>
              </div>
              <button
                onClick={handleCloseScanner}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-subtle hover:text-ink-base hover:bg-surface-2 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
              {/* STEP 1: No image yet — show instructions */}
              {!capturedImage && !scanner.scanning && (
                <div className="p-6 flex flex-col items-center">
                  {/* Viewfinder illustration */}
                  <div className="relative w-full aspect-[4/3] max-w-[280px] mb-6">
                    <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-brand-500/30 bg-surface-2/50 flex items-center justify-center">
                      {/* Corner brackets — document scanner style */}
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-3 border-l-3 border-brand-500 rounded-tl-lg" />
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-3 border-r-3 border-brand-500 rounded-tr-lg" />
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-3 border-l-3 border-brand-500 rounded-bl-lg" />
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-3 border-r-3 border-brand-500 rounded-br-lg" />
                      {/* Center icon */}
                      <div className="flex flex-col items-center gap-2 text-ink-subtle">
                        <Camera size={32} strokeWidth={1.5} />
                        <span className="text-xs font-medium">Position medicine here</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-ink-base text-center mb-2">Scan your medicine label</h4>
                  <p className="text-xs text-ink-muted text-center leading-relaxed mb-6 max-w-[240px]">
                    Point your camera at the medicine box or label. Make sure the text is clear and well-lit.
                  </p>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full max-w-[280px] py-3.5 bg-brand-gradient text-white rounded-2xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Open Camera
                  </button>

                  <p className="text-[10px] text-ink-subtle text-center mt-4">
                    Supports: Photos, screenshots, or uploaded images
                  </p>
                </div>
              )}

              {/* STEP 2: Image captured — scanning in progress */}
              {capturedImage && scanner.scanning && (
                <div className="p-5">
                  {/* Image preview with scanning animation */}
                  <div className="relative rounded-2xl overflow-hidden mb-5 animate-scan-success">
                    <img
                      src={capturedImage}
                      alt="Captured medicine"
                      className="w-full aspect-[4/3] object-cover"
                    />
                    {/* Green border overlay */}
                    <div className="absolute inset-0 rounded-2xl border-3 border-success-500/60 animate-scanner-pulse" />
                    {/* Scanning line */}
                    <div className="absolute left-[8%] right-[8%] h-0.5 bg-gradient-to-r from-transparent via-success-500 to-transparent animate-scan-line" />
                    {/* Corner brackets */}
                    <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-success-500 rounded-tl" />
                    <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-success-500 rounded-tr" />
                    <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-success-500 rounded-bl" />
                    <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-success-500 rounded-br" />
                  </div>

                  {/* Status */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Loader2 size={20} className="animate-spin text-brand-500" />
                      </div>
                      <span className="text-sm font-semibold text-ink-base">
                        {scanner.waking ? "Waking up scanner..." : "Reading medicine label..."}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted text-center">
                      {scanner.waking
                        ? "The scanner sleeps when idle. Starting up now."
                        : "AI is extracting drug name, dosage, and instructions"}
                    </p>
                    {/* Progress bar */}
                    <div className="w-full max-w-[200px] h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full animate-scan-progress" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Error */}
              {!scanner.scanning && scanner.error && (
                <div className="p-6 text-center">
                  {capturedImage && (
                    <div className="relative rounded-2xl overflow-hidden mb-5 opacity-60">
                      <img src={capturedImage} alt="Captured" className="w-full aspect-[4/3] object-cover" />
                      <div className="absolute inset-0 rounded-2xl border-2 border-danger-500/40" />
                    </div>
                  )}
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-warning-500/10 flex items-center justify-center">
                    <AlertTriangle size={22} className="text-warning-500" />
                  </div>
                  <p className="text-sm text-ink-base font-semibold mb-1">Could not read label</p>
                  <p className="text-xs text-ink-muted mb-5 leading-relaxed max-w-[260px] mx-auto">{scanner.error}</p>
                  <div className="flex gap-2 max-w-[280px] mx-auto">
                    <button
                      onClick={() => { scanner.reset(); setCapturedImage(null); cameraInputRef.current?.click(); }}
                      className="flex-1 py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Camera size={15} /> Retry
                    </button>
                    <button
                      onClick={handleCloseScanner}
                      className="px-4 py-3 bg-surface-2 text-ink-muted rounded-xl font-semibold text-sm hover:bg-surface-3 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Success — show extracted data */}
              {!scanner.scanning && scanner.result?.success && scanner.result.medicine && (
                <div className="p-5">
                  {/* Success header with mini preview */}
                  <div className="flex items-start gap-3 mb-4">
                    {capturedImage && (
                      <img src={capturedImage} alt="Scanned" className="w-14 h-14 rounded-xl object-cover border-2 border-success-500/40 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 size={14} className="text-success-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-success-600 uppercase tracking-wider">Detected</span>
                      </div>
                      <h4 className="font-bold text-ink-base text-lg leading-tight truncate">{scanner.result.medicine.name}</h4>
                      {scanner.result.medicine.brandName && (
                        <p className="text-xs text-ink-muted truncate">{scanner.result.medicine.brandName}</p>
                      )}
                    </div>
                  </div>

                  {/* Data fields */}
                  <div className="bg-surface-0 rounded-xl border border-line/40 divide-y divide-line/30 mb-4">
                    <ScanField label="Dose" value={scanner.result.medicine.dose} />
                    <ScanField label="Form" value={scanner.result.medicine.form} />
                    {scanner.result.medicine.activeIngredient && <ScanField label="Ingredient" value={scanner.result.medicine.activeIngredient} />}
                    {scanner.result.medicine.category && <ScanField label="Category" value={scanner.result.medicine.category} />}
                    {scanner.result.medicine.expiryDate && <ScanField label="Expiry" value={scanner.result.medicine.expiryDate} />}
                    {scanner.result.medicine.notes && <ScanField label="Notes" value={scanner.result.medicine.notes} />}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddScanned}
                      className="flex-1 py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add to Medicines
                    </button>
                    <button
                      onClick={() => { scanner.reset(); setCapturedImage(null); cameraInputRef.current?.click(); }}
                      className="px-4 py-3 bg-surface-2 text-ink-muted rounded-xl font-semibold text-sm hover:bg-surface-3 active:scale-[0.98] transition-all"
                    >
                      Rescan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Detail side panel
// ============================================================

function DetailPanel({
  med,
  onClose,
  onDelete,
  onUpdate,
  onAddToSchedule,
}: {
  med: MedicineItem;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<MedicineItem>) => void;
  onAddToSchedule: () => void;
}) {
  const status = getMedicineStatus(med);
  const stock = getStockState(med);
  const colors = STATUS_COLORS[status];
  const emoji = FORM_EMOJI[med.form] || "📦";

  return (
    <div className="hidden lg:flex w-80 flex-col bg-surface-1 border-l border-line/60 overflow-y-auto">
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{emoji}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-base hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>

        <h3 className="text-xl font-bold text-ink-base mb-1">{med.name}</h3>
        {med.brandName && <p className="text-sm text-ink-muted mb-3">{med.brandName}</p>}

        <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
          {colors.label}
        </span>

        <div className="mt-5 space-y-3">
          <DetailRow label="Dose" value={med.dose} icon={Pill} />
          <DetailRow label="Form" value={med.form} icon={Box} />
          <DetailRow label="Quantity" value={`${med.quantity} ${med.form === "syrup" ? "mL" : "units"}`} icon={Package} />
          {med.category && <DetailRow label="Category" value={med.category} icon={Box} />}
          {med.activeIngredient && <DetailRow label="Active ingredient" value={med.activeIngredient} icon={Pill} />}
          {med.expiryDate && (
            <DetailRow
              label="Expiry date"
              value={new Date(med.expiryDate).toLocaleDateString()}
              icon={Clock}
            />
          )}
          {med.refillDate && (
            <DetailRow
              label="Next refill"
              value={new Date(med.refillDate).toLocaleDateString()}
              icon={CalendarPlus}
            />
          )}
          {med.notes && (
            <div className="pt-2 border-t border-line/40">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block mb-1">Notes</span>
              <p className="text-sm text-ink-base leading-relaxed">{med.notes}</p>
            </div>
          )}
        </div>

        {/* Quantity adjuster */}
        <div className="mt-5 flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted">Qty:</span>
          <button
            onClick={() => onUpdate({ quantity: Math.max(0, med.quantity - 1) })}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-line/60 text-ink-base font-bold text-sm hover:bg-surface-3"
          >
            −
          </button>
          <span className="text-sm font-bold text-ink-base w-10 text-center">{med.quantity}</span>
          <button
            onClick={() => onUpdate({ quantity: med.quantity + 1 })}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-line/60 text-ink-base font-bold text-sm hover:bg-surface-3"
          >
            +
          </button>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button
            onClick={onAddToSchedule}
            className="w-full py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <CalendarPlus size={15} /> Add to Schedule
          </button>
          <button
            onClick={onDelete}
            className="w-full py-2.5 border-2 border-danger-500/40 text-danger-500 rounded-xl font-bold text-sm hover:bg-danger-500/10 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={15} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-ink-subtle flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block">{label}</span>
        <span className="text-sm text-ink-base">{value}</span>
      </div>
    </div>
  );
}

// ============================================================
// Add medicine modal
// ============================================================

function AddMedicineModal({
  onAdd,
  onClose,
}: {
  onAdd: (med: Omit<MedicineItem, "id" | "createdAt">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState<MedicineForm>("tablet");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [refillDate, setRefillDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !dose.trim()) return;
    onAdd({
      name: name.trim(),
      brandName: brandName.trim() || undefined,
      activeIngredient: activeIngredient.trim() || undefined,
      dose: dose.trim(),
      form,
      category: category || undefined,
      quantity: parseInt(quantity, 10) || 1,
      expiryDate: expiryDate || undefined,
      refillDate: refillDate || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-1 border border-line/60 rounded-2xl shadow-card overflow-y-auto max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-line/40">
          <h3 className="font-bold text-lg text-ink-base">Add Medicine</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-base hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Medicine name *" value={name} onChange={setName} placeholder="e.g. Metformin" />
          <Field label="Brand name" value={brandName} onChange={setBrandName} placeholder="e.g. Glucophage" />
          <Field label="Active ingredient" value={activeIngredient} onChange={setActiveIngredient} placeholder="e.g. Metformin HCl" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose *" value={dose} onChange={setDose} placeholder="e.g. 500 mg" />
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">Form</label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as MedicineForm)}
                className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {FORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select...</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Quantity" value={quantity} onChange={setQuantity} placeholder="1" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry date" value={expiryDate} onChange={setExpiryDate} type="date" />
            <Field label="Refill date" value={refillDate} onChange={setRefillDate} type="date" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take after food"
              rows={2}
              className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !dose.trim()}
            className="w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
          >
            Save Medicine
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  );
}

function ScanField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-ink-base font-medium text-right ml-3 truncate">{value}</span>
    </div>
  );
}

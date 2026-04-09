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

// Color-coded categories (like real medicine cabinets)
const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  "Pain Relief":      { bg: "bg-red-50 dark:bg-red-900/15",      border: "border-red-200 dark:border-red-800/40",      icon: "text-red-500" },
  "Antibiotic":       { bg: "bg-amber-50 dark:bg-amber-900/15",  border: "border-amber-200 dark:border-amber-800/40",  icon: "text-amber-500" },
  "Cardiovascular":   { bg: "bg-rose-50 dark:bg-rose-900/15",    border: "border-rose-200 dark:border-rose-800/40",    icon: "text-rose-500" },
  "Diabetes":         { bg: "bg-blue-50 dark:bg-blue-900/15",    border: "border-blue-200 dark:border-blue-800/40",    icon: "text-blue-500" },
  "Supplement":       { bg: "bg-green-50 dark:bg-green-900/15",  border: "border-green-200 dark:border-green-800/40",  icon: "text-green-500" },
  "Mental Health":    { bg: "bg-purple-50 dark:bg-purple-900/15", border: "border-purple-200 dark:border-purple-800/40", icon: "text-purple-500" },
  "Respiratory":      { bg: "bg-sky-50 dark:bg-sky-900/15",      border: "border-sky-200 dark:border-sky-800/40",      icon: "text-sky-500" },
  "Allergy":          { bg: "bg-orange-50 dark:bg-orange-900/15", border: "border-orange-200 dark:border-orange-800/40", icon: "text-orange-500" },
  "Gastrointestinal": { bg: "bg-teal-50 dark:bg-teal-900/15",   border: "border-teal-200 dark:border-teal-800/40",   icon: "text-teal-500" },
  "Thyroid":          { bg: "bg-indigo-50 dark:bg-indigo-900/15", border: "border-indigo-200 dark:border-indigo-800/40", icon: "text-indigo-500" },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect touch device (mobile) vs desktop
  const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const handleOpenScanner = () => {
    scanner.reset();
    setCapturedImage(null);
    setShowScanner(true);
    // On mobile: open camera directly. On desktop: show modal with options.
    if (isMobile) {
      setTimeout(() => cameraInputRef.current?.click(), 200);
    }
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto">
        {/* Header — stacks on mobile, inline on desktop */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-ink-base">{t("medicines_title", language)}</h2>
              <p className="text-sm text-ink-muted mt-0.5">{medicines.length} {t("medicines_items", language)}</p>
            </div>
            {/* Hidden file inputs — separate for camera vs file upload */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScanCapture}
              className="hidden"
            />
          </div>

          {/* Action buttons — full width on small mobile, inline on larger */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleOpenScanner}
              disabled={scanner.scanning}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-surface-1 border-2 border-brand-500/30 text-brand-600 rounded-xl font-bold text-sm hover:border-brand-500/60 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Camera size={18} />
              <span>{t("scanner_scan_label", language)}</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus size={16} /> {t("common_add", language)}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("contacts_search", language).replace("contacts", "medicines")}
            className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Filter pills — scrollable, large touch targets */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1 scroll-touch">
          {(["all", "active", "expiring", "expired", "low"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                filter === f
                  ? f === "expired" ? "bg-danger-500 text-white"
                  : f === "expiring" ? "bg-warning-500 text-white"
                  : f === "low" ? "bg-orange-500 text-white"
                  : "bg-brand-500 text-white"
                  : "bg-surface-2 text-ink-muted hover:text-ink-base"
              }`}
            >
              {f === "all" ? t("contacts_filter_all", language)
                : f === "low" ? t("medicines_stock_low", language)
                : f === "active" ? t("medicines_status_active", language)
                : f === "expiring" ? t("medicines_status_expiring", language)
                : t("medicines_status_expired", language)}
            </button>
          ))}
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

          {/* Medicine list — large cards, senior-friendly */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-brand-500/10 flex items-center justify-center">
                <Pill size={36} className="text-brand-500" />
              </div>
              <h3 className="font-bold text-ink-base text-xl mb-2">
                {medicines.length === 0 ? t("medicines_no_medicines", language) : t("medicines_no_matches", language)}
              </h3>
              <p className="text-base text-ink-muted max-w-[300px] mx-auto">
                {medicines.length === 0
                  ? t("medicines_add_first", language)
                  : t("medicines_try_different", language)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((med) => {
                const status = getMedicineStatus(med);
                const stock = getStockState(med);
                const statusColors = STATUS_COLORS[status];
                const catColor = CATEGORY_COLORS[med.category || ""] || { bg: "bg-surface-1", border: "border-line/60", icon: "text-ink-muted" };
                const isSelected = selectedId === med.id;

                return (
                  <button
                    key={med.id}
                    onClick={() => setSelectedId(isSelected ? null : med.id)}
                    className={`w-full text-left rounded-2xl border-2 transition-all active:scale-[0.99] ${
                      isSelected
                        ? "border-brand-500 shadow-glow"
                        : `${catColor.border} shadow-soft`
                    } ${catColor.bg}`}
                  >
                    {/* Main card content — large, readable */}
                    <div className="p-4 flex items-center gap-4">
                      {/* Icon — large, color-coded */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        status === "expired" ? "bg-danger-500/15" : status === "expiring" ? "bg-warning-500/15" : "bg-white dark:bg-surface-2"
                      }`}>
                        <Pill size={28} className={
                          status === "expired" ? "text-danger-500" : status === "expiring" ? "text-warning-500" : catColor.icon
                        } />
                      </div>

                      {/* Text — large for readability */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-ink-base truncate leading-tight">{med.name}</h3>
                        <p className="text-sm text-ink-muted mt-0.5">{med.dose} · {med.form}</p>

                        {/* Status badges — clear, large text */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
                            {statusColors.label}
                          </span>
                          {stock !== "ok" && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-danger-500/10 text-danger-500 border border-danger-500/30 flex items-center gap-1`}>
                              <AlertTriangle size={11} />
                              {STOCK_COLORS[stock].label}
                            </span>
                          )}
                          {med.quantity > 0 && (
                            <span className="text-xs font-semibold text-ink-muted bg-surface-2 px-2 py-1 rounded-full">
                              Qty: {med.quantity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight size={20} className={`text-ink-subtle flex-shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>

                    {/* Expanded detail — simple, clear */}
                    {isSelected && (
                      <div className="px-4 pb-4 pt-2 border-t border-line/30 space-y-3 animate-in fade-in duration-200">
                        {/* Info rows — large, readable */}
                        {med.brandName && (
                          <InfoRow icon={Package} label="Brand" value={med.brandName} />
                        )}
                        {med.activeIngredient && (
                          <InfoRow icon={Pill} label="Ingredient" value={med.activeIngredient} />
                        )}
                        {med.category && (
                          <InfoRow icon={Box} label="Category" value={med.category} />
                        )}
                        {med.expiryDate && (
                          <InfoRow icon={Clock} label="Expiry" value={new Date(med.expiryDate).toLocaleDateString(undefined, { month: "long", year: "numeric" })} />
                        )}
                        {med.notes && (
                          <div className="p-3 bg-surface-2/50 rounded-xl">
                            <p className="text-sm text-ink-base leading-relaxed">{med.notes}</p>
                          </div>
                        )}

                        {/* Quantity adjuster — large buttons */}
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-sm font-semibold text-ink-muted">Quantity:</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdate(med.id, { quantity: Math.max(0, med.quantity - 1) }); }}
                            className="w-10 h-10 rounded-xl bg-surface-2 border border-line/60 text-ink-base font-bold text-lg hover:bg-surface-3 flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-lg font-black text-ink-base w-8 text-center">{med.quantity}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdate(med.id, { quantity: med.quantity + 1 }); }}
                            className="w-10 h-10 rounded-xl bg-surface-2 border border-line/60 text-ink-base font-bold text-lg hover:bg-surface-3 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>

                        {/* Action buttons — large, clear labels */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onAddToSchedule(med); }}
                            className="flex-1 py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            <CalendarPlus size={16} /> Add to Schedule
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm("Remove this medicine?")) onDelete(med.id); }}
                            className="py-3 px-4 border-2 border-danger-500/30 text-danger-500 rounded-xl font-bold text-sm hover:bg-danger-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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

                  {/* Desktop: two options. Mobile: camera only (auto-opens) */}
                  <div className="w-full max-w-[280px] space-y-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-3.5 bg-brand-gradient text-white rounded-2xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Camera size={18} />
                      {t("scanner_open_camera", language)}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border-2 border-line/60 text-ink-base rounded-2xl font-semibold text-sm hover:bg-surface-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <ScanLine size={16} />
                      Upload photo
                    </button>
                  </div>

                  <p className="text-[10px] text-ink-subtle text-center mt-3">
                    {t("scanner_supports", language)}
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
                      onClick={() => { scanner.reset(); setCapturedImage(null); (isMobile ? cameraInputRef : fileInputRef).current?.click(); }}
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

              {/* STEP 4: Success — EDITABLE fields for review + correction */}
              {!scanner.scanning && scanner.result?.success && scanner.result.medicine && (
                <ScanResultEditor
                  medicine={scanner.result.medicine}
                  capturedImage={capturedImage}
                  onSave={(edited) => {
                    onAdd(edited);
                    scanner.reset();
                    setCapturedImage(null);
                    setShowScanner(false);
                  }}
                  onRescan={() => { scanner.reset(); setCapturedImage(null); (isMobile ? cameraInputRef : fileInputRef).current?.click(); }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Add medicine modal
// ============================================================
// (DetailPanel removed — replaced by inline expandable cards above)
// (DetailRow removed — replaced by InfoRow component)


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

/**
 * Editable scan result — lets users review + correct OCR before saving.
 * Industry pattern: CamScanner, Adobe Scan, Google Lens all let you edit.
 */
function ScanResultEditor({
  medicine,
  capturedImage,
  onSave,
  onRescan,
}: {
  medicine: Omit<MedicineItem, "id" | "createdAt">;
  capturedImage: string | null;
  onSave: (edited: Omit<MedicineItem, "id" | "createdAt">) => void;
  onRescan: () => void;
}) {
  const [name, setName] = useState(medicine.name || "");
  const [dose, setDose] = useState(medicine.dose || "");
  const [form, setForm] = useState<MedicineForm>(medicine.form || "tablet");
  const [brandName, setBrandName] = useState(medicine.brandName || "");
  const [activeIngredient, setActiveIngredient] = useState(medicine.activeIngredient || "");
  const [category, setCategory] = useState(medicine.category || "");
  const [expiryDate, setExpiryDate] = useState(medicine.expiryDate || "");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState(medicine.notes || "");

  const handleSave = () => {
    if (!name.trim() || !dose.trim()) return;
    onSave({
      name: name.trim(),
      dose: dose.trim(),
      form,
      brandName: brandName.trim() || undefined,
      activeIngredient: activeIngredient.trim() || undefined,
      category: category || undefined,
      quantity: parseInt(quantity, 10) || 1,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="p-5">
      {/* Success header */}
      <div className="flex items-start gap-3 mb-4">
        {capturedImage && (
          <img src={capturedImage} alt="Scanned" className="w-12 h-12 rounded-xl object-cover border-2 border-success-500/40 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 size={14} className="text-success-500 flex-shrink-0" />
            <span className="text-xs font-bold text-success-600 uppercase tracking-wider">{t("scanner_detected", "en")}</span>
          </div>
          <p className="text-[11px] text-ink-muted">Review and correct any fields below, then save.</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-3 mb-4">
        <ScanEditField label="Name *" value={name} onChange={setName} />
        <ScanEditField label="Dose *" value={dose} onChange={setDose} placeholder="e.g. 500mg" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">Form</label>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value as MedicineForm)}
              className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {(["tablet", "capsule", "syrup", "inhaler", "injection", "cream", "drops", "patch", "other"] as MedicineForm[]).map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
          <ScanEditField label="Quantity" value={quantity} onChange={setQuantity} type="number" />
        </div>
        <ScanEditField label="Brand" value={brandName} onChange={setBrandName} />
        <ScanEditField label="Active ingredient" value={activeIngredient} onChange={setActiveIngredient} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Select...</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ScanEditField label="Expiry" value={expiryDate} onChange={setExpiryDate} placeholder="YYYY-MM" />
        </div>
        <ScanEditField label="Notes" value={notes} onChange={setNotes} placeholder="Dosage instructions, warnings..." />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !dose.trim()}
          className="flex-1 py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> {t("scanner_add_to_medicines", "en")}
        </button>
        <button
          onClick={onRescan}
          className="px-4 py-3 bg-surface-2 text-ink-muted rounded-xl font-semibold text-sm hover:bg-surface-3 active:scale-[0.98] transition-all"
        >
          {t("scanner_rescan", "en")}
        </button>
      </div>
    </div>
  );
}

function ScanEditField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon size={16} className="text-ink-subtle flex-shrink-0" />
      <span className="text-xs font-semibold text-ink-muted w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-ink-base">{value}</span>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  User2,
  Heart,
  Pill,
  Activity,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
} from "lucide-react";
import {
  loadEHRProfile,
  saveEHRProfile,
  loadMedications,
  CHRONIC_CONDITIONS_OPTIONS,
  ALLERGY_COMMON,
  type EHRProfile,
  type Medication,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface EHRWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  language: SupportedLanguage;
}

const STEPS = [
  { icon: User2, label: "Basic Info" },
  { icon: Heart, label: "Medical History" },
  { icon: Pill, label: "Medications" },
  { icon: Activity, label: "Lifestyle" },
  { icon: ClipboardCheck, label: "Review" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const;

export function EHRWizard({ onComplete, onCancel, language }: EHRWizardProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<EHRProfile>({});
  const [meds, setMeds] = useState<Medication[]>([]);
  const [customCondition, setCustomCondition] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");
  const [customSurgery, setCustomSurgery] = useState("");
  const [customFamily, setCustomFamily] = useState("");

  // Load existing profile on mount (resume if partially completed).
  useEffect(() => {
    const existing = loadEHRProfile();
    setProfile(existing);
    if (existing.wizardStep) setStep(Math.min(existing.wizardStep, 4));
    setMeds(loadMedications().filter((m) => m.active));
  }, []);

  const update = (patch: Partial<EHRProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
  };

  const toggleArrayItem = (field: keyof EHRProfile, item: string) => {
    const arr = ((profile as any)[field] as string[]) || [];
    const next = arr.includes(item) ? arr.filter((x: string) => x !== item) : [...arr, item];
    update({ [field]: next });
  };

  const addCustomItem = (field: keyof EHRProfile, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const arr = ((profile as any)[field] as string[]) || [];
    if (!arr.includes(value.trim())) {
      update({ [field]: [...arr, value.trim()] });
    }
    setter("");
  };

  const next = () => {
    const nextStep = Math.min(step + 1, 4);
    setStep(nextStep);
    saveEHRProfile({ ...profile, wizardStep: nextStep });
  };

  const prev = () => setStep(Math.max(step - 1, 0));

  const finish = () => {
    const final: EHRProfile = { ...profile, completedAt: new Date().toISOString(), wizardStep: 5 };
    saveEHRProfile(final);
    onComplete();
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex-1 overflow-y-auto pb-mobile-nav scroll-touch">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-ink-base tracking-tight">
            Health Profile
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Optional — helps MedOS give you personalized advice
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={i}
                  onClick={() => i <= step && setStep(i)}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    active
                      ? "text-brand-600"
                      : done
                      ? "text-success-500"
                      : "text-ink-subtle"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      active
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : done
                        ? "border-success-500 bg-success-500/10"
                        : "border-line bg-surface-2"
                    }`}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                  </div>
                  <span className="text-[10px] font-semibold hidden sm:block">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-surface-1 border border-line/60 rounded-2xl p-6 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-300">
          {step === 0 && (
            <StepBasicInfo profile={profile} update={update} />
          )}
          {step === 1 && (
            <StepMedicalHistory
              profile={profile}
              toggleArrayItem={toggleArrayItem}
              addCustomItem={addCustomItem}
              customCondition={customCondition}
              setCustomCondition={setCustomCondition}
              customAllergy={customAllergy}
              setCustomAllergy={setCustomAllergy}
              customSurgery={customSurgery}
              setCustomSurgery={setCustomSurgery}
              customFamily={customFamily}
              setCustomFamily={setCustomFamily}
            />
          )}
          {step === 2 && <StepMedications meds={meds} />}
          {step === 3 && <StepLifestyle profile={profile} update={update} />}
          {step === 4 && <StepReview profile={profile} meds={meds} />}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          {step > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink-base transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="text-sm font-semibold text-ink-muted hover:text-ink-base transition-colors"
            >
              Skip for now
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
            >
              <Check size={16} /> Save Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step components
// ============================================================

function StepBasicInfo({
  profile,
  update,
}: {
  profile: EHRProfile;
  update: (p: Partial<EHRProfile>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-ink-base">Basic Information</h3>
      <p className="text-sm text-ink-muted">All fields are optional.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <InputField label="First name" value={profile.firstName} onChange={(v) => update({ firstName: v })} placeholder="John" />
        <InputField label="Last name" value={profile.lastName} onChange={(v) => update({ lastName: v })} placeholder="Doe" />
        <InputField label="Date of birth" value={profile.dateOfBirth} onChange={(v) => update({ dateOfBirth: v })} type="date" />
        <SelectField label="Gender" value={profile.gender || ""} onChange={(v) => update({ gender: v as any })} options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} />
        <SelectField label="Blood type" value={profile.bloodType || ""} onChange={(v) => update({ bloodType: v as any })} options={BLOOD_TYPES.map((b) => ({ value: b, label: b === "unknown" ? "Unknown" : b }))} />
        <InputField label="Height" value={profile.height} onChange={(v) => update({ height: v })} placeholder="175 cm" />
        <InputField label="Weight" value={profile.weight} onChange={(v) => update({ weight: v })} placeholder="70 kg" />
      </div>
    </div>
  );
}

function StepMedicalHistory({
  profile,
  toggleArrayItem,
  addCustomItem,
  customCondition,
  setCustomCondition,
  customAllergy,
  setCustomAllergy,
  customSurgery,
  setCustomSurgery,
  customFamily,
  setCustomFamily,
}: {
  profile: EHRProfile;
  toggleArrayItem: (field: keyof EHRProfile, item: string) => void;
  addCustomItem: (field: keyof EHRProfile, value: string, setter: (v: string) => void) => void;
  customCondition: string;
  setCustomCondition: (v: string) => void;
  customAllergy: string;
  setCustomAllergy: (v: string) => void;
  customSurgery: string;
  setCustomSurgery: (v: string) => void;
  customFamily: string;
  setCustomFamily: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="font-bold text-lg text-ink-base">Medical History</h3>

      {/* Chronic conditions */}
      <div>
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Chronic conditions
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CHRONIC_CONDITIONS_OPTIONS.map((c) => (
            <ChipToggle
              key={c}
              label={c}
              active={profile.chronicConditions?.includes(c) ?? false}
              onClick={() => toggleArrayItem("chronicConditions", c)}
            />
          ))}
        </div>
        <AddCustom value={customCondition} onChange={setCustomCondition} onAdd={() => addCustomItem("chronicConditions", customCondition, setCustomCondition)} placeholder="Add other condition..." />
      </div>

      {/* Allergies */}
      <div>
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Allergies
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ALLERGY_COMMON.map((a) => (
            <ChipToggle
              key={a}
              label={a}
              active={profile.allergies?.includes(a) ?? false}
              onClick={() => toggleArrayItem("allergies", a)}
            />
          ))}
        </div>
        <AddCustom value={customAllergy} onChange={setCustomAllergy} onAdd={() => addCustomItem("allergies", customAllergy, setCustomAllergy)} placeholder="Add other allergy..." />
      </div>

      {/* Past surgeries */}
      <div>
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Past surgeries
        </label>
        <TagList items={profile.pastSurgeries} onRemove={(item) => toggleArrayItem("pastSurgeries", item)} />
        <AddCustom value={customSurgery} onChange={setCustomSurgery} onAdd={() => addCustomItem("pastSurgeries", customSurgery, setCustomSurgery)} placeholder="e.g. Appendectomy 2020" />
      </div>

      {/* Family history */}
      <div>
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 block">
          Family history
        </label>
        <TagList items={profile.familyHistory} onRemove={(item) => toggleArrayItem("familyHistory", item)} />
        <AddCustom value={customFamily} onChange={setCustomFamily} onAdd={() => addCustomItem("familyHistory", customFamily, setCustomFamily)} placeholder="e.g. Father: heart disease" />
      </div>
    </div>
  );
}

function StepMedications({ meds }: { meds: Medication[] }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-ink-base">Current Medications</h3>
      <p className="text-sm text-ink-muted">
        These are pulled from your medication tracker. Add or edit them in the Medications view.
      </p>
      {meds.length === 0 ? (
        <div className="text-center py-8">
          <Pill size={28} className="mx-auto text-ink-subtle mb-2" />
          <p className="text-sm text-ink-muted">No active medications</p>
          <p className="text-xs text-ink-subtle mt-1">
            You can add them later from the Medications view
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {meds.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/50 border border-line/40">
              <Pill size={16} className="text-brand-500" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-ink-base block">{m.name}</span>
                <span className="text-xs text-ink-muted">{m.dose} · {m.frequency} · {m.times.join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepLifestyle({
  profile,
  update,
}: {
  profile: EHRProfile;
  update: (p: Partial<EHRProfile>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-ink-base">Lifestyle</h3>
      <p className="text-sm text-ink-muted">Helps the AI consider your lifestyle when giving advice.</p>

      <SelectField
        label="Smoking status"
        value={profile.smokingStatus || ""}
        onChange={(v) => update({ smokingStatus: v as any })}
        options={[
          { value: "never", label: "Never smoked" },
          { value: "former", label: "Former smoker" },
          { value: "current", label: "Current smoker" },
          { value: "prefer-not-to-say", label: "Prefer not to say" },
        ]}
      />
      <SelectField
        label="Alcohol use"
        value={profile.alcoholUse || ""}
        onChange={(v) => update({ alcoholUse: v as any })}
        options={[
          { value: "none", label: "None" },
          { value: "occasional", label: "Occasional (social)" },
          { value: "moderate", label: "Moderate (1-2 drinks/day)" },
          { value: "heavy", label: "Heavy" },
          { value: "prefer-not-to-say", label: "Prefer not to say" },
        ]}
      />
      <SelectField
        label="Exercise frequency"
        value={profile.exerciseFrequency || ""}
        onChange={(v) => update({ exerciseFrequency: v as any })}
        options={[
          { value: "none", label: "None / Sedentary" },
          { value: "1-2-per-week", label: "1–2 times per week" },
          { value: "3-5-per-week", label: "3–5 times per week" },
          { value: "daily", label: "Daily" },
        ]}
      />
      <SelectField
        label="Diet type"
        value={profile.dietType || ""}
        onChange={(v) => update({ dietType: v as any })}
        options={[
          { value: "regular", label: "Regular / No restrictions" },
          { value: "vegetarian", label: "Vegetarian" },
          { value: "vegan", label: "Vegan" },
          { value: "mediterranean", label: "Mediterranean" },
          { value: "low-carb", label: "Low-carb / Keto" },
          { value: "other", label: "Other" },
        ]}
      />
    </div>
  );
}

function StepReview({ profile, meds }: { profile: EHRProfile; meds: Medication[] }) {
  const sections = [
    { label: "Name", value: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—" },
    { label: "Date of birth", value: profile.dateOfBirth || "—" },
    { label: "Gender", value: profile.gender || "—" },
    { label: "Blood type", value: profile.bloodType || "—" },
    { label: "Height / Weight", value: [profile.height, profile.weight].filter(Boolean).join(" / ") || "—" },
    { label: "Chronic conditions", value: profile.chronicConditions?.join(", ") || "None" },
    { label: "Allergies", value: profile.allergies?.join(", ") || "None known" },
    { label: "Past surgeries", value: profile.pastSurgeries?.join(", ") || "None" },
    { label: "Family history", value: profile.familyHistory?.join(", ") || "None" },
    { label: "Medications", value: meds.length > 0 ? meds.map((m) => `${m.name} ${m.dose}`).join(", ") : "None" },
    { label: "Smoking", value: profile.smokingStatus || "—" },
    { label: "Alcohol", value: profile.alcoholUse || "—" },
    { label: "Exercise", value: profile.exerciseFrequency || "—" },
    { label: "Diet", value: profile.dietType || "—" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-ink-base">Review Your Profile</h3>
      <p className="text-sm text-ink-muted">
        This information stays private and is used to personalize your AI medical advice.
      </p>
      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.label} className="flex items-start gap-3 py-2 border-b border-line/30 last:border-0">
            <span className="text-xs font-semibold text-ink-subtle w-28 flex-shrink-0 pt-0.5">
              {s.label}
            </span>
            <span className="text-sm text-ink-base flex-1">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Shared UI primitives
// ============================================================

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-brand-500/15 border-brand-500/40 text-brand-700 dark:text-brand-300"
          : "bg-surface-2 border-line/50 text-ink-muted hover:border-brand-500/30"
      }`}
    >
      {label}
    </button>
  );
}

function AddCustom({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!value.trim()}
        className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-500/30 text-brand-500 disabled:opacity-30"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function TagList({ items, onRemove }: { items?: string[]; onRemove: (item: string) => void }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-xs font-medium text-brand-700 dark:text-brand-300"
        >
          {item}
          <button onClick={() => onRemove(item)} className="hover:text-danger-500">
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

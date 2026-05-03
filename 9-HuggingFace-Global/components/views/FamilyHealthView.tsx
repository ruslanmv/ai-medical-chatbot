"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Link2,
  CalendarDays,
  ShieldCheck,
  HeartPulse,
  Download,
  Baby,
  UserRound,
  Crown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type {
  FamilyConsentStatus,
  FamilyMember,
  FamilyRelationship,
  MedOSMode,
  MonthlyHealthRecord,
  MonthlyStatus,
} from "@/lib/family-health";
import { currentMonth } from "@/lib/family-health";
import { type SupportedLanguage } from "@/lib/i18n";

interface FamilyHealthViewProps {
  mode: MedOSMode;
  members: FamilyMember[];
  records: MonthlyHealthRecord[];
  currentMemberId: string | null;
  onSetMode: (mode: MedOSMode) => void;
  onSetCurrentMember: (memberId: string) => void;
  onSeedDefaultFamily: () => void;
  onAddMember: (member: Omit<FamilyMember, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => void;
  onUpsertMonthlyRecord: (
    record: Omit<MonthlyHealthRecord, "id" | "createdAt" | "updatedAt">,
  ) => void;
  onCreateInvite: (memberId: string, mode: MedOSMode) => { code: string; expiresAt: string };
  onExport: () => unknown;
  language: SupportedLanguage;
}

const MODE_META: Record<MedOSMode, { label: string; description: string; icon: any }> = {
  standard: { label: "Standard", description: "Simple personal MedOS", icon: UserRound },
  adult: { label: "Adult", description: "Own profile + consent sharing", icon: ShieldCheck },
  child: { label: "Child", description: "Guardian-managed simple mode", icon: Baby },
  "family-admin": { label: "Family Admin", description: "Manage MyFamilyHealth", icon: Crown },
};

const STATUS_META: Record<MonthlyStatus, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-success-500/10 text-success-600 dark:text-success-400 border-success-500/30" },
  watch: { label: "Watch", className: "bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-500/30" },
  "needs-care": { label: "Needs care", className: "bg-danger-500/10 text-danger-600 dark:text-danger-400 border-danger-500/30" },
  unknown: { label: "Unknown", className: "bg-surface-2 text-ink-muted border-line/60" },
};

const RELATIONSHIPS: FamilyRelationship[] = ["self", "spouse", "child", "parent", "guardian", "other"];
const MODES: MedOSMode[] = ["standard", "adult", "child", "family-admin"];
const CONSENTS: FamilyConsentStatus[] = ["owner", "accepted", "pending", "guardian-managed", "revoked"];

export function FamilyHealthView({
  mode,
  members,
  records,
  currentMemberId,
  onSetMode,
  onSetCurrentMember,
  onSeedDefaultFamily,
  onAddMember,
  onUpdateMember,
  onUpsertMonthlyRecord,
  onCreateInvite,
  onExport,
}: FamilyHealthViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const selectedMember = members.find((m) => m.id === currentMemberId) || members[0];
  const month = currentMonth();
  const selectedRecord = selectedMember
    ? records.find((r) => r.memberId === selectedMember.id && r.month === month)
    : undefined;

  const stats = useMemo(() => {
    const checked = members.filter((m) => records.some((r) => r.memberId === m.id && r.month === month)).length;
    const followUps = records.filter((r) => r.month === month && r.followUpNeeded).length;
    return { checked, followUps };
  }, [members, records, month]);

  const exportJson = () => {
    const data = onExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myfamilyhealth-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-mobile-nav scroll-touch">
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold mb-3">
              <Users size={14} /> Universal Health Family
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-base">MyFamilyHealth</h2>
            <p className="text-sm text-ink-muted mt-1 max-w-2xl">
              Link each family member&apos;s MedOS client to one private family tree and monitor monthly health timelines.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSeedDefaultFamily}
              className="px-3 py-2 rounded-xl bg-surface-2 border border-line/60 text-sm font-semibold text-ink-base hover:bg-surface-1 transition-colors"
            >
              Create father/wife/2 children
            </button>
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-line/60 text-sm font-semibold text-ink-base hover:bg-surface-1 transition-colors"
            >
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {MODES.map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => onSetMode(m)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active
                    ? "bg-brand-500/10 border-brand-500/40 shadow-soft"
                    : "bg-surface-1 border-line/60 hover:bg-surface-2"
                }`}
              >
                <Icon size={20} className={active ? "text-brand-600" : "text-ink-subtle"} />
                <div className="font-bold text-ink-base mt-2">{meta.label}</div>
                <div className="text-xs text-ink-muted mt-1">{meta.description}</div>
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <MetricCard label="Family members" value={String(members.length)} icon={Users} />
          <MetricCard label={`Checked in ${month}`} value={`${stats.checked}/${members.length || 0}`} icon={CalendarDays} />
          <MetricCard label="Follow-ups" value={String(stats.followUps)} icon={AlertTriangle} />
        </section>

        {members.length === 0 ? (
          <EmptyFamily onSeed={onSeedDefaultFamily} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
            <div className="space-y-4">
              <div className="rounded-3xl bg-surface-1 border border-line/60 p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ink-base">Family tree</h3>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-bold"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {members.map((member) => {
                    const latest = records
                      .filter((r) => r.memberId === member.id)
                      .sort((a, b) => b.month.localeCompare(a.month))[0];
                    return (
                      <button
                        key={member.id}
                        onClick={() => onSetCurrentMember(member.id)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          selectedMember?.id === member.id
                            ? "bg-brand-500/10 border-brand-500/40"
                            : "bg-surface-0 border-line/50 hover:bg-surface-2"
                        }`}
                      >
                        <div className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-xl shadow-soft">
                          {member.avatarEmoji || "👤"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-ink-base truncate">{member.displayName}</div>
                          <div className="text-xs text-ink-muted capitalize">
                            {member.relationship} · {MODE_META[member.mode].label}
                          </div>
                        </div>
                        <StatusPill status={latest?.status || "unknown"} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {showAdd && (
                <AddMemberCard
                  onCancel={() => setShowAdd(false)}
                  onAdd={(member) => {
                    onAddMember(member);
                    setShowAdd(false);
                  }}
                />
              )}
            </div>

            {selectedMember && (
              <MemberPanel
                member={selectedMember}
                record={selectedRecord}
                month={month}
                inviteCode={inviteCode}
                onUpdateMember={onUpdateMember}
                onSaveRecord={onUpsertMonthlyRecord}
                onCreateInvite={() => {
                  const invite = onCreateInvite(selectedMember.id, selectedMember.mode);
                  setInviteCode(invite.code);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl bg-surface-1 border border-line/60 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{label}</span>
        <Icon size={17} className="text-brand-500" />
      </div>
      <div className="text-2xl font-black text-ink-base mt-2">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: MonthlyStatus }) {
  const meta = STATUS_META[status];
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${meta.className}`}>{meta.label}</span>;
}

function EmptyFamily({ onSeed, onAdd }: { onSeed: () => void; onAdd: () => void }) {
  return (
    <div className="text-center rounded-3xl bg-surface-1 border border-line/60 p-10 shadow-soft">
      <Users size={42} className="mx-auto text-brand-500 mb-4" />
      <h3 className="text-xl font-bold text-ink-base mb-2">Create your Universal Health Family</h3>
      <p className="text-sm text-ink-muted max-w-xl mx-auto mb-5">
        Start with the default father, wife, and two children structure or add members manually.
      </p>
      <div className="flex justify-center gap-2">
        <button onClick={onSeed} className="px-4 py-2 rounded-xl bg-brand-gradient text-white font-bold text-sm shadow-glow">
          Use default family
        </button>
        <button onClick={onAdd} className="px-4 py-2 rounded-xl bg-surface-2 border border-line/60 text-ink-base font-bold text-sm">
          Add manually
        </button>
      </div>
    </div>
  );
}

function AddMemberCard({
  onAdd,
  onCancel,
}: {
  onAdd: (member: Omit<FamilyMember, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("child");
  const [mode, setMode] = useState<MedOSMode>("child");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");

  const defaultConsent: FamilyConsentStatus = mode === "child" ? "guardian-managed" : mode === "family-admin" ? "owner" : "pending";

  return (
    <div className="rounded-3xl bg-surface-1 border border-line/60 p-4 shadow-soft">
      <h3 className="font-bold text-ink-base mb-3">Add family member</h3>
      <div className="space-y-3">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Name"
          className="w-full px-3 py-2 rounded-xl bg-surface-0 border border-line/60 text-ink-base text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={relationship} onChange={(e) => setRelationship(e.target.value as FamilyRelationship)} className="px-3 py-2 rounded-xl bg-surface-0 border border-line/60 text-ink-base text-sm">
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as MedOSMode)} className="px-3 py-2 rounded-xl bg-surface-0 border border-line/60 text-ink-base text-sm">
            {MODES.map((m) => <option key={m} value={m}>{MODE_META[m].label}</option>)}
          </select>
        </div>
        <input
          value={avatarEmoji}
          onChange={(e) => setAvatarEmoji(e.target.value.slice(0, 2))}
          placeholder="Emoji"
          className="w-full px-3 py-2 rounded-xl bg-surface-0 border border-line/60 text-ink-base text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={() => displayName.trim() && onAdd({ displayName: displayName.trim(), relationship, mode, avatarEmoji, consentStatus: defaultConsent })}
            className="flex-1 px-3 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold"
          >
            Add
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-surface-2 border border-line/60 text-sm font-bold text-ink-base">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberPanel({
  member,
  record,
  month,
  inviteCode,
  onUpdateMember,
  onSaveRecord,
  onCreateInvite,
}: {
  member: FamilyMember;
  record?: MonthlyHealthRecord;
  month: string;
  inviteCode: string | null;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => void;
  onSaveRecord: (record: Omit<MonthlyHealthRecord, "id" | "createdAt" | "updatedAt">) => void;
  onCreateInvite: () => void;
}) {
  const [status, setStatus] = useState<MonthlyStatus>(record?.status || "unknown");
  const [symptoms, setSymptoms] = useState(record?.symptoms || "");
  const [appointments, setAppointments] = useState(record?.appointments || "");
  const [medicines, setMedicines] = useState(record?.medicines || "");
  const [vitals, setVitals] = useState(record?.vitals || "");
  const [vaccines, setVaccines] = useState(record?.vaccines || "");
  const [notes, setNotes] = useState(record?.notes || "");
  const [followUpNeeded, setFollowUpNeeded] = useState(Boolean(record?.followUpNeeded));

  useEffect(() => {
    setStatus(record?.status || "unknown");
    setSymptoms(record?.symptoms || "");
    setAppointments(record?.appointments || "");
    setMedicines(record?.medicines || "");
    setVitals(record?.vitals || "");
    setVaccines(record?.vaccines || "");
    setNotes(record?.notes || "");
    setFollowUpNeeded(Boolean(record?.followUpNeeded));
  }, [member.id, month, record?.id]);

  const save = () => {
    onSaveRecord({
      memberId: member.id,
      month,
      status,
      symptoms,
      appointments,
      medicines,
      vitals,
      vaccines,
      notes,
      followUpNeeded,
    });
  };

  return (
    <div className="rounded-3xl bg-surface-1 border border-line/60 p-5 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-brand-gradient text-white flex items-center justify-center text-2xl shadow-glow">
            {member.avatarEmoji || "👤"}
          </div>
          <div>
            <h3 className="text-xl font-black text-ink-base">{member.displayName}</h3>
            <p className="text-xs text-ink-muted capitalize">
              {member.relationship} · {MODE_META[member.mode].label} · {member.consentStatus.replace("-", " ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONSENTS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdateMember(member.id, { consentStatus: c })}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                member.consentStatus === c
                  ? "bg-brand-500/10 text-brand-600 border-brand-500/30"
                  : "bg-surface-2 text-ink-subtle border-line/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-ink-base flex items-center gap-2"><CalendarDays size={17} /> Monthly check-in</h4>
              <p className="text-xs text-ink-muted">Month: {month}</p>
            </div>
            <StatusPill status={status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {(Object.keys(STATUS_META) as MonthlyStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${status === s ? STATUS_META[s].className : "bg-surface-0 border-line/60 text-ink-muted"}`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Symptoms this month" value={symptoms} onChange={setSymptoms} placeholder="fever, cough, pain, mood..." />
            <Field label="Appointments" value={appointments} onChange={setAppointments} placeholder="doctor, dentist, lab..." />
            <Field label="Medicines" value={medicines} onChange={setMedicines} placeholder="started, stopped, refill..." />
            <Field label="Vitals" value={vitals} onChange={setVitals} placeholder="BP, weight, glucose..." />
            <Field label="Vaccines" value={vaccines} onChange={setVaccines} placeholder="given or due..." />
            <Field label="Notes" value={notes} onChange={setNotes} placeholder="parent/adult notes..." />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink-base">
            <input type="checkbox" checked={followUpNeeded} onChange={(e) => setFollowUpNeeded(e.target.checked)} />
            Follow-up needed with a healthcare professional
          </label>

          <button onClick={save} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gradient text-white font-bold text-sm shadow-glow">
            <CheckCircle2 size={16} /> Save monthly timeline
          </button>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl bg-surface-0 border border-line/60 p-4">
            <h4 className="font-bold text-ink-base flex items-center gap-2 mb-2"><Link2 size={16} /> Link own MedOS</h4>
            <p className="text-xs text-ink-muted mb-3">
              Create a temporary code so this member can install MedOS and link to MyFamilyHealth.
            </p>
            <button onClick={onCreateInvite} className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line/60 text-sm font-bold text-ink-base">
              Generate invite code
            </button>
            {inviteCode && (
              <div className="mt-3 rounded-xl bg-brand-500/10 border border-brand-500/30 p-3 text-center">
                <div className="text-[10px] font-bold uppercase text-brand-600">Invite code</div>
                <div className="text-2xl font-black tracking-widest text-ink-base">{inviteCode}</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-warning-500/10 border border-warning-500/30 p-4">
            <h4 className="font-bold text-warning-700 dark:text-warning-400 flex items-center gap-2"><HeartPulse size={16} /> Safety</h4>
            <p className="text-xs text-ink-muted mt-2">
              MyFamilyHealth tracks and summarizes. It does not diagnose. For urgent symptoms, use emergency care.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-ink-subtle mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-xl bg-surface-0 border border-line/60 text-ink-base text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
      />
    </label>
  );
}

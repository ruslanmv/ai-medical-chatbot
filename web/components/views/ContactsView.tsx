"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Trash2,
  Edit3,
  Navigation,
  Stethoscope,
  Pill,
  Building2,
  ChevronRight,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import {
  loadContacts,
  saveContact,
  updateContact,
  removeContact,
  type MedContact,
  type ContactType,
} from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface ContactsViewProps {
  contacts: MedContact[];
  onAdd: (contact: Omit<MedContact, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<MedContact>) => void;
  onDelete: (id: string) => void;
  onNavigate: (view: string) => void;
  language: SupportedLanguage;
}

type FilterTab = "all" | "doctor" | "pharmacy";

const TYPE_META: Record<ContactType, { icon: any; label: string; color: string }> = {
  doctor: { icon: Stethoscope, label: "Doctor", color: "text-brand-500 bg-brand-500/10" },
  pharmacy: { icon: Pill, label: "Pharmacy", color: "text-success-500 bg-success-500/10" },
  drugstore: { icon: Pill, label: "Drugstore", color: "text-success-500 bg-success-500/10" },
  hospital: { icon: Building2, label: "Hospital", color: "text-danger-500 bg-danger-500/10" },
  clinic: { icon: Building2, label: "Clinic", color: "text-accent-500 bg-accent-500/10" },
  other: { icon: MapPin, label: "Other", color: "text-ink-muted bg-surface-2" },
};

export function ContactsView({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  onNavigate,
  language,
}: ContactsViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = useMemo(() => {
    let items = contacts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.specialty?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.phone?.includes(q),
      );
    }
    if (filter === "doctor") items = items.filter((c) => c.type === "doctor");
    if (filter === "pharmacy") items = items.filter((c) => ["pharmacy", "drugstore"].includes(c.type));
    return items;
  }, [contacts, search, filter]);

  const selected = selectedId ? contacts.find((c) => c.id === selectedId) : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">{t("contacts_title", language)}</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              {contacts.length} {contacts.length === 1 ? t("contacts_contact_saved", language) : t("contacts_saved", language)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("nearby")}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-surface-1 border border-line/60 text-ink-muted rounded-xl font-semibold text-xs hover:text-ink-base hover:border-brand-500/40 transition-all active:scale-[0.98]"
            >
              <MapPin size={14} /> {t("nearby_find_nearby", language)}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus size={16} /> {t("common_add", language)}
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("contacts_search", language)}
              className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "doctor", "pharmacy"] as FilterTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  filter === f ? "bg-brand-500 text-white" : "bg-surface-2 text-ink-muted hover:text-ink-base"
                }`}
              >
                {f === "all" ? t("contacts_filter_all", language) : f === "doctor" ? t("contacts_filter_doctors", language) : t("contacts_filter_pharmacies", language)}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <UserPlus size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-2">
              {contacts.length === 0 ? t("contacts_no_contacts", language) : t("contacts_no_matches", language)}
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[280px] mx-auto mb-4">
              {contacts.length === 0
                ? t("contacts_no_contacts_desc", language)
                : t("contacts_no_matches_desc", language)}
            </p>
            {contacts.length === 0 && (
              <button
                onClick={() => onNavigate("nearby")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <MapPin size={16} /> {t("nearby_find_nearby", language)}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const meta = TYPE_META[c.type] || TYPE_META.other;
              const Icon = meta.icon;
              const isExpanded = selectedId === c.id;

              return (
                <div key={c.id} className={`rounded-2xl border transition-all ${
                  isExpanded ? "bg-brand-500/5 border-brand-500/40 shadow-soft" : "bg-surface-1 border-line/40"
                }`}>
                  <button
                    onClick={() => setSelectedId(isExpanded ? null : c.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-ink-base truncate">{c.name}</span>
                        {c.isFavorite && <Star size={12} className="text-warning-500 fill-warning-500 flex-shrink-0" />}
                      </div>
                      {c.specialty && <span className="text-xs text-ink-muted block">{c.specialty}</span>}
                      {c.phone && (
                        <span className="text-xs text-ink-subtle flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {c.phone}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className={`text-ink-subtle flex-shrink-0 transition-transform mt-1 ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-line/30 pt-3 animate-in fade-in duration-200">
                      {c.address && (
                        <div className="flex items-start gap-2 text-xs text-ink-muted">
                          <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{c.address}{c.postalCode ? `, ${c.postalCode}` : ""}{c.city ? `, ${c.city}` : ""}</span>
                        </div>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-brand-500">
                          <Mail size={12} /> {c.email}
                        </a>
                      )}
                      {c.openingHours && (
                        <div className="flex items-start gap-2 text-xs text-ink-muted">
                          <Clock size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{c.openingHours}</span>
                        </div>
                      )}
                      {c.notes && (
                        <p className="text-xs text-ink-muted bg-surface-2/50 rounded-lg p-2">{c.notes}</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {c.phone && (
                          <a href={`tel:${c.phone}`}
                            className="flex-1 min-w-[100px] py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all">
                            <Phone size={12} /> {t("contacts_call", language)}
                          </a>
                        )}
                        {c.directionsUrl && (
                          <a href={c.directionsUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 min-w-[100px] py-2.5 bg-surface-2 text-ink-base rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-3 transition-all">
                            <Navigation size={12} /> {t("nearby_directions", language)}
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`}
                            className="py-2.5 px-3 bg-surface-2 text-ink-muted rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-3 transition-all">
                            <Mail size={12} />
                          </a>
                        )}
                        <button
                          onClick={() => onUpdate(c.id, { isFavorite: !c.isFavorite })}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            c.isFavorite ? "bg-warning-500/10 text-warning-500" : "bg-surface-2 text-ink-muted hover:bg-surface-3"
                          }`}>
                          <Star size={12} className={c.isFavorite ? "fill-warning-500" : ""} />
                        </button>
                        <button
                          onClick={() => { if (confirm("Remove this contact?")) onDelete(c.id); }}
                          className="py-2.5 px-3 bg-surface-2 text-ink-subtle rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:text-danger-500 hover:bg-danger-500/10 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add contact modal */}
      {showAddForm && (
        <AddContactModal
          onAdd={(c) => { onAdd(c); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Add Contact Modal
// ============================================================

function AddContactModal({
  onAdd,
  onClose,
}: {
  onAdd: (contact: Omit<MedContact, "id" | "createdAt">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("doctor");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      type,
      specialty: specialty.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
      source: "manual",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-1 rounded-t-3xl sm:rounded-2xl shadow-card overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-line/40">
          <h3 className="font-bold text-lg text-ink-base">New Contact</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-base hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Name *" value={name} onChange={setName} placeholder="Dr. Smith / CVS Pharmacy" />

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(["doctor", "pharmacy", "drugstore", "hospital", "clinic", "other"] as ContactType[]).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    type === t ? "bg-brand-500 text-white" : "bg-surface-2 text-ink-muted"
                  }`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {type === "doctor" && (
            <Field label="Specialty" value={specialty} onChange={setSpecialty} placeholder="e.g. Cardiologist, GP" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555-0123" type="tel" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="doctor@clinic.com" type="email" />
          </div>

          <Field label="Address" value={address} onChange={setAddress} placeholder="123 Main St" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Postal code" value={postalCode} onChange={setPostalCode} placeholder="10001" />
            <Field label="City" value={city} onChange={setCity} placeholder="New York" />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Accepts walk-ins, speaks Spanish"
              rows={2} className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
        </div>

        <div className="p-5 pt-0">
          <button onClick={handleSubmit} disabled={!name.trim()}
            className="w-full py-3 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
            Save Contact
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-surface-2 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
    </div>
  );
}

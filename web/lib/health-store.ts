/**
 * MedOS Health Store — client-side health data persistence.
 *
 * All data is stored in localStorage as JSON. Zero server calls, zero
 * accounts, fully private. The patient owns their data and can export
 * it at any time as a JSON file (for backup or to share with a doctor).
 *
 * Each entity type gets its own localStorage key so reads and writes are
 * scoped and independent (one corrupt key doesn't nuke everything).
 */

// ============================================================
// Types
// ============================================================

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'inhaler' | 'injection' | 'cream' | 'drops' | 'patch' | 'other';
export type MedicineStatus = 'active' | 'expiring' | 'expired' | 'discontinued';
export type StockState = 'ok' | 'low' | 'out';

export interface MedicineItem {
  id: string;
  name: string;
  brandName?: string;
  activeIngredient?: string;
  dose: string;
  form: MedicineForm;
  category?: string; // e.g. "Diabetes", "Pain Relief", "Supplement"
  quantity: number;
  expiryDate?: string; // ISO date
  refillDate?: string; // ISO date
  notes?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: 'daily' | 'twice-daily' | 'three-daily' | 'weekly' | 'as-needed';
  times: string[]; // e.g. ["08:00", "20:00"]
  startDate: string; // ISO date
  endDate?: string;
  notes?: string;
  active: boolean;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string; // ISO date
  time: string; // ISO time or scheduled slot like "08:00"
  taken: boolean;
}

export type AppointmentType =
  | 'doctor'
  | 'lab-test'
  | 'exam'
  | 'blood-test'
  | 'imaging'
  | 'vaccination'
  | 'therapy'
  | 'other';

export type AppointmentStatus = 'upcoming' | 'completed' | 'missed' | 'cancelled';

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  date: string; // ISO date
  time: string;
  location?: string;
  doctor?: string;
  notes?: string;
  status: AppointmentStatus;
  recurring?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
}

export type VitalType =
  | 'blood-pressure'
  | 'blood-glucose'
  | 'temperature'
  | 'weight'
  | 'heart-rate'
  | 'oxygen-saturation';

export interface VitalReading {
  id: string;
  type: VitalType;
  value: string; // e.g. "120/80", "98.6", "72"
  unit: string; // e.g. "mmHg", "mg/dL", "°C", "kg", "bpm", "%"
  date: string;
  time: string;
  notes?: string;
}

export type RecordType = 'lab-report' | 'clinical-note' | 'prescription' | 'certificate' | 'imaging' | 'other';

export interface HealthRecord {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  notes?: string;
  tags?: string[];
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  date: string;
  preview: string; // first ~120 chars of first user message
  messageCount: number;
  topic?: string;
  /** Editable display title (defaults to the first user message). */
  title?: string;
  /** Full thread, persisted so the sidebar list can RESUME the conversation
   *  in place (ChatGPT / Claude style), not just re-seed its first message. */
  messages?: ConversationMessage[];
}

// ============================================================
// Contacts — doctors, pharmacies, drugstores address book
// ============================================================

export type ContactType = 'doctor' | 'pharmacy' | 'drugstore' | 'hospital' | 'clinic' | 'other';

export interface MedContact {
  id: string;
  name: string;
  type: ContactType;
  specialty?: string;    // e.g. "Cardiologist", "General Practitioner"
  phone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  lat?: number;
  lon?: number;
  openingHours?: string;
  notes?: string;
  isFavorite?: boolean;
  source?: string;       // e.g. "osm_overpass", "manual"
  directionsUrl?: string;
  mapsUrl?: string;
  createdAt: string;
}

// ============================================================
// EHR Profile — Electronic Health Record wizard data
// ============================================================

export interface EHRProfile {
  // Step 1: Basic info
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO date
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  height?: string; // e.g. "175 cm" or "5'9"
  weight?: string; // e.g. "70 kg"

  // Step 2: Medical history
  chronicConditions?: string[]; // e.g. ["Type 2 Diabetes", "Hypertension"]
  pastSurgeries?: string[]; // e.g. ["Appendectomy 2018"]
  allergies?: string[]; // e.g. ["Penicillin", "Peanuts"]
  familyHistory?: string[]; // e.g. ["Father: heart disease", "Mother: diabetes"]

  // Step 3: Current medications (references to medication tracker)
  // No separate field needed — we read from loadMedications()

  // Step 4: Lifestyle
  smokingStatus?: 'never' | 'former' | 'current' | 'prefer-not-to-say';
  alcoholUse?: 'none' | 'occasional' | 'moderate' | 'heavy' | 'prefer-not-to-say';
  exerciseFrequency?: 'none' | '1-2-per-week' | '3-5-per-week' | 'daily';
  dietType?: 'regular' | 'vegetarian' | 'vegan' | 'mediterranean' | 'low-carb' | 'other';

  // Metadata
  completedAt?: string; // ISO timestamp when wizard was last completed
  wizardStep?: number; // Last completed step (for resume)
}

export const CHRONIC_CONDITIONS_OPTIONS = [
  'Type 1 Diabetes',
  'Type 2 Diabetes',
  'Gestational Diabetes',
  'Hypertension',
  'Hypothyroidism (Hashimoto)',
  'Hyperthyroidism (Graves)',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Atrial Fibrillation',
  'Chronic Kidney Disease',
  'Depression',
  'Anxiety',
  'Epilepsy',
  'Rheumatoid Arthritis',
  'Osteoporosis',
  'Cancer (specify)',
  'HIV/AIDS',
  'Hepatitis B/C',
  'Metabolic Syndrome',
  'Addison Disease',
  'Cushing Syndrome',
  'PCOS',
  'Celiac Disease',
  'IBD (Crohn/Colitis)',
  'Other',
] as const;

export const ALLERGY_COMMON = [
  'Penicillin',
  'Sulfonamides',
  'Aspirin / NSAIDs',
  'Iodine / Contrast dye',
  'Latex',
  'Peanuts',
  'Shellfish',
  'Eggs',
  'Milk / Dairy',
  'Soy',
  'Wheat / Gluten',
  'Bee stings',
  'None known',
] as const;

// ============================================================
// EHR storage (single record per user, keyed as "ehr_profile")
// ============================================================

const EHR_KEY = 'medos_ehr_profile';

export function loadEHRProfile(): EHRProfile {
  const store = medium();
  if (!store) return {};
  try {
    const raw = store.getItem(scopedKey(EHR_KEY));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEHRProfile(profile: EHRProfile): void {
  const store = medium();
  if (!store) return;
  try {
    store.setItem(scopedKey(EHR_KEY), JSON.stringify(profile));
  } catch {}
}

/**
 * Build a COMPACT patient context string optimized for small LLMs (8B).
 *
 * Design for small context windows:
 *   - Under 150 tokens total (critical for Qwen 2.5 7B, Llama 3.2 8B)
 *   - Key-value pairs on one line, comma-separated
 *   - Only clinically relevant fields (skip height, blood type, etc.)
 *   - Medications abbreviated: name+dose only
 *   - Injected ONCE on the first user message of the conversation
 *   - Returns empty string if no profile data (guest/empty)
 */
export function buildPatientContext(): string {
  const p = loadEHRProfile();
  const meds = loadMedications().filter((m) => m.active);
  const lines: string[] = [];

  // Demographics — clinical signal for differential weighting.
  const demo: string[] = [];
  if (p.dateOfBirth) {
    const age = Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 86400000));
    if (age >= 0 && age < 130) demo.push(`age=${age}`);
  }
  if (p.gender && p.gender !== 'prefer-not-to-say') {
    demo.push(`sex=${p.gender[0].toUpperCase()}`);
  }
  if (demo.length) lines.push(demo.join(' '));

  if (p.chronicConditions?.length) lines.push(`conditions=${p.chronicConditions.join(', ')}`);

  if (p.allergies?.length && !p.allergies.includes('None known')) {
    lines.push(`allergies=${p.allergies.join(', ')}`);
  }

  if (meds.length > 0) {
    lines.push(`medications=${meds.map((m) => `${m.name} ${m.dose}`).join(', ')}`);
  }

  const life: string[] = [];
  if (p.smokingStatus === 'current') life.push('smoker');
  else if (p.smokingStatus === 'former') life.push('ex-smoker');
  if (p.alcoholUse === 'heavy') life.push('heavy alcohol');
  if (life.length) lines.push(`lifestyle=${life.join(', ')}`);

  if (lines.length === 0) return '';
  // XML-tagged block matches the format the server-side builder emits
  // and the system prompt instructs the LLM to consume.
  return `\n<patient_context>\n${lines.join('\n')}\n</patient_context>`;
}

// ============================================================
// Vital type metadata (units, labels, normal ranges)
// ============================================================

export const VITAL_META: Record<
  VitalType,
  { label: string; unit: string; placeholder: string; emoji: string }
> = {
  'blood-pressure': {
    label: 'Blood Pressure',
    unit: 'mmHg',
    placeholder: '120/80',
    emoji: '🫀',
  },
  'blood-glucose': {
    label: 'Blood Glucose',
    unit: 'mg/dL',
    placeholder: '100',
    emoji: '🩸',
  },
  temperature: {
    label: 'Temperature',
    unit: '°C',
    placeholder: '36.6',
    emoji: '🌡️',
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    placeholder: '70',
    emoji: '⚖️',
  },
  'heart-rate': {
    label: 'Heart Rate',
    unit: 'bpm',
    placeholder: '72',
    emoji: '💓',
  },
  'oxygen-saturation': {
    label: 'Oxygen Saturation',
    unit: '%',
    placeholder: '98',
    emoji: '🫁',
  },
};

export const APPOINTMENT_TYPE_META: Record<
  AppointmentType,
  { label: string; emoji: string }
> = {
  doctor: { label: 'Doctor Visit', emoji: '👨‍⚕️' },
  'lab-test': { label: 'Lab Test', emoji: '🧪' },
  exam: { label: 'Medical Exam', emoji: '📋' },
  'blood-test': { label: 'Blood Test', emoji: '🩸' },
  imaging: { label: 'Imaging / X-Ray', emoji: '🔬' },
  vaccination: { label: 'Vaccination', emoji: '💉' },
  therapy: { label: 'Therapy Session', emoji: '🧠' },
  other: { label: 'Other', emoji: '📌' },
};

export const FREQUENCY_LABELS: Record<Medication['frequency'], string> = {
  daily: 'Once daily',
  'twice-daily': 'Twice daily',
  'three-daily': 'Three times daily',
  weekly: 'Weekly',
  'as-needed': 'As needed',
};

// ============================================================
// Storage keys
// ============================================================

const KEYS = {
  medications: 'medos_medications',
  medicationLogs: 'medos_medication_logs',
  appointments: 'medos_appointments',
  vitals: 'medos_vitals',
  records: 'medos_records',
  history: 'medos_history',
  medicines: 'medos_medicines',
  contacts: 'medos_contacts',
} as const;

// ============================================================
// Storage scope — account isolation + guest ephemerality
// ============================================================
//
// The scope decides WHERE (and under what key) health data lives:
//   - user  -> window.localStorage, key namespaced by id ("…__<uid>"),
//              a durable cache of the account's server data, isolated so
//              two accounts on one browser can never read each other.
//   - guest -> window.sessionStorage, bare key. sessionStorage auto-clears
//              when the tab/window closes, so an anonymous session on a
//              shared device leaves nothing behind for the next person
//              (OWASP: keep transient sensitive data out of localStorage).
//
// The app sets the active scope from the auth state via setStorageScope().

type StorageScope = { kind: 'guest' } | { kind: 'user'; id: string };

let activeScope: StorageScope = { kind: 'guest' };

export function setStorageScope(scope: StorageScope): void {
  activeScope = scope;
}

/** Storage medium for the active scope. */
function medium(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return activeScope.kind === 'user' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Namespaced key: `<base>__<uid>` for a user, bare `<base>` for a guest
 *  (guest data already lives in its own sessionStorage silo). */
function scopedKey(base: string): string {
  return activeScope.kind === 'user' ? `${base}__${activeScope.id}` : base;
}

// ============================================================
// Generic CRUD helpers
// ============================================================

function load<T>(key: string): T[] {
  const store = medium();
  if (!store) return [];
  try {
    const raw = store.getItem(scopedKey(key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  const store = medium();
  if (!store) return;
  try {
    store.setItem(scopedKey(key), JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently fail.
  }
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ============================================================
// Public API — each entity type gets load / save / add / update
// / remove. All pure and synchronous.
// ============================================================

// --- Medications ---

export function loadMedications(): Medication[] {
  return load<Medication>(KEYS.medications);
}

export function saveMedication(med: Omit<Medication, 'id'>): Medication {
  const all = loadMedications();
  const item: Medication = { ...med, id: genId() };
  all.push(item);
  save(KEYS.medications, all);
  return item;
}

export function updateMedication(id: string, patch: Partial<Medication>): void {
  const all = loadMedications().map((m) =>
    m.id === id ? { ...m, ...patch } : m,
  );
  save(KEYS.medications, all);
}

export function removeMedication(id: string): void {
  save(
    KEYS.medications,
    loadMedications().filter((m) => m.id !== id),
  );
}

// --- Medication logs ---

export function loadMedicationLogs(): MedicationLog[] {
  return load<MedicationLog>(KEYS.medicationLogs);
}

export function logMedicationTaken(
  medicationId: string,
  date: string,
  time: string,
): void {
  const all = loadMedicationLogs();
  all.push({ id: genId(), medicationId, date, time, taken: true });
  save(KEYS.medicationLogs, all);
}

export function isMedicationTaken(
  medicationId: string,
  date: string,
  time: string,
): boolean {
  return loadMedicationLogs().some(
    (l) =>
      l.medicationId === medicationId && l.date === date && l.time === time && l.taken,
  );
}

export function getMedicationStreak(medicationId: string): number {
  const logs = loadMedicationLogs().filter(
    (l) => l.medicationId === medicationId && l.taken,
  );
  if (logs.length === 0) return 0;
  const dates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// --- Appointments ---

export function loadAppointments(): Appointment[] {
  return load<Appointment>(KEYS.appointments);
}

export function saveAppointment(appt: Omit<Appointment, 'id'>): Appointment {
  const all = loadAppointments();
  const item: Appointment = { ...appt, id: genId() };
  all.push(item);
  save(KEYS.appointments, all);
  return item;
}

export function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): void {
  const all = loadAppointments().map((a) =>
    a.id === id ? { ...a, ...patch } : a,
  );
  save(KEYS.appointments, all);
}

export function removeAppointment(id: string): void {
  save(
    KEYS.appointments,
    loadAppointments().filter((a) => a.id !== id),
  );
}

// --- Vitals ---

export function loadVitals(): VitalReading[] {
  return load<VitalReading>(KEYS.vitals);
}

export function saveVital(reading: Omit<VitalReading, 'id'>): VitalReading {
  const all = loadVitals();
  const item: VitalReading = { ...reading, id: genId() };
  all.push(item);
  save(KEYS.vitals, all);
  return item;
}

export function removeVital(id: string): void {
  save(
    KEYS.vitals,
    loadVitals().filter((v) => v.id !== id),
  );
}

// --- Health records ---

export function loadRecords(): HealthRecord[] {
  return load<HealthRecord>(KEYS.records);
}

export function saveRecord(rec: Omit<HealthRecord, 'id'>): HealthRecord {
  const all = loadRecords();
  const item: HealthRecord = { ...rec, id: genId() };
  all.push(item);
  save(KEYS.records, all);
  return item;
}

export function updateRecord(id: string, patch: Partial<HealthRecord>): void {
  const all = loadRecords().map((r) =>
    r.id === id ? { ...r, ...patch } : r,
  );
  save(KEYS.records, all);
}

export function removeRecord(id: string): void {
  save(
    KEYS.records,
    loadRecords().filter((r) => r.id !== id),
  );
}

// --- Medicine inventory ---

export function loadMedicines(): MedicineItem[] {
  return load<MedicineItem>(KEYS.medicines);
}

export function saveMedicine(med: Omit<MedicineItem, 'id' | 'createdAt'>): MedicineItem {
  const all = loadMedicines();
  const item: MedicineItem = { ...med, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  save(KEYS.medicines, all);
  return item;
}

export function updateMedicine(id: string, patch: Partial<MedicineItem>): void {
  const all = loadMedicines().map((m) =>
    m.id === id ? { ...m, ...patch } : m,
  );
  save(KEYS.medicines, all);
}

export function removeMedicine(id: string): void {
  save(KEYS.medicines, loadMedicines().filter((m) => m.id !== id));
}

/** Compute the status of a medicine based on its expiry date. */
export function getMedicineStatus(med: MedicineItem): MedicineStatus {
  if (!med.expiryDate) return 'active';
  const now = new Date();
  const exp = new Date(med.expiryDate);
  const daysUntilExpiry = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'active';
}

/** Compute stock state based on quantity. */
export function getStockState(med: MedicineItem): StockState {
  if (med.quantity <= 0) return 'out';
  if (med.quantity <= 5) return 'low';
  return 'ok';
}

/** Build a summary of the medicine inventory for AI context. */
export function buildMedicineInventoryContext(): string {
  const meds = loadMedicines();
  if (meds.length === 0) return '';
  const lines = meds.map((m) => {
    const status = getMedicineStatus(m);
    const stock = getStockState(m);
    return `${m.name} ${m.dose} (${m.form}, qty:${m.quantity}, ${status}${stock === 'low' ? ', LOW STOCK' : stock === 'out' ? ', OUT OF STOCK' : ''})`;
  });
  return `\n[Medicine inventory: ${lines.join('; ')}]`;
}

// --- Conversation history ---

export function loadHistory(): ConversationSummary[] {
  return load<ConversationSummary>(KEYS.history);
}

export function saveConversation(
  summary: Omit<ConversationSummary, 'id'>,
): ConversationSummary {
  const all = loadHistory();
  const item: ConversationSummary = { ...summary, id: genId() };
  all.unshift(item); // newest first
  // Keep only last 100 conversations
  if (all.length > 100) all.length = 100;
  save(KEYS.history, all);
  return item;
}

/**
 * Upsert a full conversation thread by id — updates in place and moves it to
 * the top if it already exists, otherwise prepends it. The chat auto-save
 * uses this so each conversation is ONE growing entry the sidebar list can
 * resume, rather than a fresh summary per turn.
 */
export function upsertConversation(conv: ConversationSummary): void {
  const all = loadHistory();
  const idx = all.findIndex((c) => c.id === conv.id);
  if (idx >= 0) all.splice(idx, 1);
  all.unshift(conv); // newest first
  if (all.length > 100) all.length = 100;
  save(KEYS.history, all);
}

/** Fetch a single conversation (with its full thread) by id. */
export function getConversation(id: string): ConversationSummary | null {
  return loadHistory().find((c) => c.id === id) || null;
}

/** Rename a conversation's display title. */
export function renameConversation(id: string, title: string): void {
  const all = loadHistory();
  const c = all.find((x) => x.id === id);
  if (c) {
    c.title = title;
    save(KEYS.history, all);
  }
}

export function removeConversation(id: string): void {
  save(
    KEYS.history,
    loadHistory().filter((h) => h.id !== id),
  );
}

export function clearHistory(): void {
  save(KEYS.history, []);
}

/**
 * Wipe ALL personal health data from this browser's localStorage:
 * medications, logs, appointments, vitals, records, chat history,
 * medicine inventory, contacts, and the EHR profile.
 *
 * Called on sign-out / account deletion so a shared device never leaks one
 * person's medical data (or chat history) to the next user, and a later
 * login can't absorb a previous user's residue into the wrong account.
 * Non-PII keys (settings, theme, auth token) are intentionally untouched.
 */
export function clearAllHealthData(): void {
  const store = medium();
  if (!store) return;
  for (const key of Object.values(KEYS)) {
    try { store.removeItem(scopedKey(key)); } catch { /* storage unavailable */ }
  }
  try { store.removeItem(scopedKey(EHR_KEY)); } catch { /* storage unavailable */ }
}

/**
 * Clear the guest (sessionStorage) silo regardless of the active scope —
 * used after a guest's data has been migrated into their new account on
 * sign-in, so nothing lingers in the anonymous silo.
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return;
  let ss: Storage;
  try { ss = window.sessionStorage; } catch { return; }
  for (const key of Object.values(KEYS)) {
    try { ss.removeItem(key); } catch { /* ignore */ }
  }
  try { ss.removeItem(EHR_KEY); } catch { /* ignore */ }
}

/**
 * One-time migration of pre-namespacing data. Older builds stored every
 * user's data under bare localStorage keys (medos_medications, …). When a
 * user scope is first activated, copy any such legacy data into that
 * user's namespace (only if the namespace is still empty) and drop the bare
 * keys, so existing single-account installs keep their data after the
 * namespacing change. Cross-account residue on a shared device is bounded
 * by the sign-out wipe + the authoritative pull-on-login from the server.
 */
export function migrateLegacyToUser(userId: string): void {
  if (typeof window === 'undefined') return;
  let ls: Storage;
  try { ls = window.localStorage; } catch { return; }
  for (const base of [...Object.values(KEYS), EHR_KEY]) {
    try {
      const legacy = ls.getItem(base);
      if (legacy != null && ls.getItem(`${base}__${userId}`) == null) {
        ls.setItem(`${base}__${userId}`, legacy);
      }
      ls.removeItem(base);
    } catch { /* ignore */ }
  }
}

/**
 * Merge two id-keyed collections, with `incoming` (server) winning on
 * conflicts. Lets hydrateFromServer add server rows without dropping
 * local items that haven't been pushed yet.
 */
function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const x of local) byId.set(x.id, x);
  for (const x of incoming) byId.set(x.id, x);
  return Array.from(byId.values());
}

/**
 * Hydrate local stores from the authoritative server dataset pulled on
 * login (rows of { id, type, data } from GET /api/health-data). Each
 * collection is merged (server wins) so a user's data reappears after a
 * logout -> login and data from other devices shows up — without dropping
 * anything entered locally as a guest before signing in.
 */
export function hydrateFromServer(
  items: Array<{ id: string; type: string; data: any }>,
): void {
  if (typeof window === 'undefined' || !Array.isArray(items)) return;
  const bucket: Record<string, Array<{ id: string }>> = {};
  let ehr: EHRProfile | null = null;
  for (const it of items) {
    if (!it || !it.data) continue;
    if (it.type === 'ehr_profile') { ehr = it.data as EHRProfile; continue; }
    (bucket[it.type] ||= []).push(it.data);
  }
  const apply = (key: string, type: string) => {
    if (bucket[type]) save(key, mergeById(load<{ id: string }>(key), bucket[type]));
  };
  apply(KEYS.medications, 'medication');
  apply(KEYS.medicationLogs, 'medication_log');
  apply(KEYS.appointments, 'appointment');
  apply(KEYS.vitals, 'vital');
  apply(KEYS.records, 'record');
  apply(KEYS.medicines, 'medicine');
  apply(KEYS.contacts, 'contact');
  apply(KEYS.history, 'conversation');
  if (ehr) saveEHRProfile(ehr);
}

// --- Contacts (address book) ---

export function loadContacts(): MedContact[] {
  return load<MedContact>(KEYS.contacts);
}

export function saveContact(contact: Omit<MedContact, 'id' | 'createdAt'>): MedContact {
  const all = loadContacts();
  const item: MedContact = { ...contact, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  save(KEYS.contacts, all);
  return item;
}

export function updateContact(id: string, patch: Partial<MedContact>): void {
  const all = loadContacts().map((c) => c.id === id ? { ...c, ...patch } : c);
  save(KEYS.contacts, all);
}

export function removeContact(id: string): void {
  save(KEYS.contacts, loadContacts().filter((c) => c.id !== id));
}

/** Build a compact contacts context string for the AI chat. */
export function buildContactsContext(): string {
  const contacts = loadContacts();
  if (contacts.length === 0) return '';
  const lines = contacts.map((c) => {
    const parts = [c.name];
    if (c.type) parts.push(`(${c.type})`);
    if (c.specialty) parts.push(c.specialty);
    if (c.phone) parts.push(`tel:${c.phone}`);
    if (c.address) parts.push(c.address);
    return parts.join(' ');
  });
  return `\n[My contacts: ${lines.join('; ')}]`;
}

// ============================================================
// Export all data as a single JSON object (for backup / sharing
// with a doctor).
// ============================================================

export interface HealthExport {
  exportedAt: string;
  version: '1.0';
  medications: Medication[];
  medicationLogs: MedicationLog[];
  appointments: Appointment[];
  vitals: VitalReading[];
  records: HealthRecord[];
  medicines: MedicineItem[];
  history: ConversationSummary[];
  ehrProfile: EHRProfile;
  contacts: MedContact[];
}

export function exportAllHealthData(): HealthExport {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    medications: loadMedications(),
    medicationLogs: loadMedicationLogs(),
    appointments: loadAppointments(),
    vitals: loadVitals(),
    records: loadRecords(),
    medicines: loadMedicines(),
    history: loadHistory(),
    ehrProfile: loadEHRProfile(),
    contacts: loadContacts(),
  };
}

export function downloadHealthData(): void {
  const data = exportAllHealthData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medos-health-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Helpers
// ============================================================

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeISO(): string {
  return new Date().toTimeString().slice(0, 5);
}

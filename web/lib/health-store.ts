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

export interface ConversationSummary {
  id: string;
  date: string;
  preview: string; // first ~120 chars of first user message
  messageCount: number;
  topic?: string;
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
} as const;

// ============================================================
// Generic CRUD helpers
// ============================================================

function load<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
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

export function removeConversation(id: string): void {
  save(
    KEYS.history,
    loadHistory().filter((h) => h.id !== id),
  );
}

export function clearHistory(): void {
  save(KEYS.history, []);
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
  history: ConversationSummary[];
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
    history: loadHistory(),
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

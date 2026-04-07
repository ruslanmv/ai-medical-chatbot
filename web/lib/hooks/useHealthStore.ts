"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as hs from "../health-store";

/**
 * Build a flat array of sync items from all localStorage entities.
 * Used for the initial bulk sync on login.
 */
function buildSyncPayload(): Array<{ id: string; type: string; data: any }> {
  const items: Array<{ id: string; type: string; data: any }> = [];
  for (const m of hs.loadMedications()) items.push({ id: m.id, type: "medication", data: m });
  for (const l of hs.loadMedicationLogs()) items.push({ id: l.id, type: "medication_log", data: l });
  for (const a of hs.loadAppointments()) items.push({ id: a.id, type: "appointment", data: a });
  for (const v of hs.loadVitals()) items.push({ id: v.id, type: "vital", data: v });
  for (const r of hs.loadRecords()) items.push({ id: r.id, type: "record", data: r });
  for (const m of hs.loadMedicines()) items.push({ id: m.id, type: "medicine", data: m });
  for (const c of hs.loadHistory()) items.push({ id: c.id, type: "conversation", data: c });
  // EHR profile — stored as a single record with a fixed ID per user
  const ehr = hs.loadEHRProfile();
  if (ehr.completedAt) {
    items.push({ id: "ehr-profile", type: "ehr_profile", data: ehr });
  }
  return items;
}

/**
 * React hook wrapping the health-store's localStorage CRUD.
 *
 * When `authToken` is provided (user is logged in), mutations are
 * also synced to the HF Space backend via /api/proxy/health-data.
 * The initial login triggers a bulk sync of all existing localStorage
 * data to the server (migration from guest → account).
 *
 * All writes are localStorage-first (offline-capable), with async
 * server sync as a best-effort background operation.
 */
export function useHealthStore(authToken?: string | null) {
  const [medications, setMedications] = useState<hs.Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<hs.MedicationLog[]>([]);
  const [appointments, setAppointments] = useState<hs.Appointment[]>([]);
  const [vitals, setVitals] = useState<hs.VitalReading[]>([]);
  const [records, setRecords] = useState<hs.HealthRecord[]>([]);
  const [medicines, setMedicines] = useState<hs.MedicineItem[]>([]);
  const [ehrProfile, setEhrProfile] = useState<hs.EHRProfile>({});
  const [history, setHistory] = useState<hs.ConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setMedications(hs.loadMedications());
    setMedicationLogs(hs.loadMedicationLogs());
    setAppointments(hs.loadAppointments());
    setVitals(hs.loadVitals());
    setRecords(hs.loadRecords());
    setMedicines(hs.loadMedicines());
    setEhrProfile(hs.loadEHRProfile());
    setHistory(hs.loadHistory());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  // --- Server sync (when authenticated) ---
  const synced = useRef(false);

  // On first login, bulk-sync all localStorage to server.
  useEffect(() => {
    if (!authToken || synced.current) return;
    synced.current = true;
    const items = buildSyncPayload();
    if (items.length === 0) return;
    fetch("/api/proxy/health-data/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ items }),
    }).catch(() => {});
  }, [authToken]);

  /** Best-effort server upsert — fire and forget. */
  const syncItem = useCallback(
    (id: string, type: string, data: any) => {
      if (!authToken) return;
      fetch("/api/proxy/health-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id, type, data }),
      }).catch(() => {});
    },
    [authToken],
  );

  const syncDelete = useCallback(
    (id: string) => {
      if (!authToken) return;
      fetch(`/api/proxy/health-data?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    },
    [authToken],
  );

  // --- Medications ---
  const addMedication = useCallback(
    (med: Omit<hs.Medication, "id">) => {
      const saved = hs.saveMedication(med);
      refresh();
      syncItem(saved.id, "medication", saved);
    },
    [refresh, syncItem],
  );
  const editMedication = useCallback(
    (id: string, patch: Partial<hs.Medication>) => {
      hs.updateMedication(id, patch);
      refresh();
      const updated = hs.loadMedications().find((m) => m.id === id);
      if (updated) syncItem(id, "medication", updated);
    },
    [refresh, syncItem],
  );
  const deleteMedication = useCallback(
    (id: string) => {
      hs.removeMedication(id);
      refresh();
      syncDelete(id);
    },
    [refresh, syncDelete],
  );
  const markMedTaken = useCallback(
    (medicationId: string, date: string, time: string) => {
      hs.logMedicationTaken(medicationId, date, time);
      refresh();
      // Sync the log entry
      const logs = hs.loadMedicationLogs();
      const latest = logs[logs.length - 1];
      if (latest) syncItem(latest.id, "medication_log", latest);
    },
    [refresh, syncItem],
  );

  // --- Appointments ---
  const addAppointment = useCallback(
    (appt: Omit<hs.Appointment, "id">) => {
      const saved = hs.saveAppointment(appt);
      refresh();
      syncItem(saved.id, "appointment", saved);
    },
    [refresh, syncItem],
  );
  const editAppointment = useCallback(
    (id: string, patch: Partial<hs.Appointment>) => {
      hs.updateAppointment(id, patch);
      refresh();
      const updated = hs.loadAppointments().find((a) => a.id === id);
      if (updated) syncItem(id, "appointment", updated);
    },
    [refresh, syncItem],
  );
  const deleteAppointment = useCallback(
    (id: string) => {
      hs.removeAppointment(id);
      refresh();
      syncDelete(id);
    },
    [refresh, syncDelete],
  );

  // --- Vitals ---
  const addVital = useCallback(
    (reading: Omit<hs.VitalReading, "id">) => {
      const saved = hs.saveVital(reading);
      refresh();
      syncItem(saved.id, "vital", saved);
    },
    [refresh, syncItem],
  );
  const deleteVital = useCallback(
    (id: string) => {
      hs.removeVital(id);
      refresh();
      syncDelete(id);
    },
    [refresh, syncDelete],
  );

  // --- Records ---
  const addRecord = useCallback(
    (rec: Omit<hs.HealthRecord, "id">) => {
      const saved = hs.saveRecord(rec);
      refresh();
      syncItem(saved.id, "record", saved);
    },
    [refresh, syncItem],
  );
  const editRecord = useCallback(
    (id: string, patch: Partial<hs.HealthRecord>) => {
      hs.updateRecord(id, patch);
      refresh();
      const updated = hs.loadRecords().find((r) => r.id === id);
      if (updated) syncItem(id, "record", updated);
    },
    [refresh, syncItem],
  );
  const deleteRecord = useCallback(
    (id: string) => {
      hs.removeRecord(id);
      refresh();
      syncDelete(id);
    },
    [refresh, syncDelete],
  );

  // --- Medicines (inventory) ---
  const addMedicine = useCallback(
    (med: Omit<hs.MedicineItem, "id" | "createdAt">) => {
      const saved = hs.saveMedicine(med);
      refresh();
      syncItem(saved.id, "medicine", saved);
    },
    [refresh, syncItem],
  );
  const editMedicine = useCallback(
    (id: string, patch: Partial<hs.MedicineItem>) => {
      hs.updateMedicine(id, patch);
      refresh();
      const updated = hs.loadMedicines().find((m) => m.id === id);
      if (updated) syncItem(id, "medicine", updated);
    },
    [refresh, syncItem],
  );
  const deleteMedicine = useCallback(
    (id: string) => {
      hs.removeMedicine(id);
      refresh();
      syncDelete(id);
    },
    [refresh, syncDelete],
  );

  // --- EHR Profile ---
  const saveEHR = useCallback(
    (profile: hs.EHRProfile) => {
      hs.saveEHRProfile(profile);
      setEhrProfile(profile);
      // Sync to server as a single record
      if (profile.completedAt) {
        syncItem("ehr-profile", "ehr_profile", profile);
      }
    },
    [syncItem],
  );

  // --- History ---
  const saveSession = useCallback(
    (summary: Omit<hs.ConversationSummary, "id">) => {
      hs.saveConversation(summary);
      refresh();
    },
    [refresh],
  );
  const deleteSession = useCallback(
    (id: string) => {
      hs.removeConversation(id);
      refresh();
    },
    [refresh],
  );
  const clearAllHistory = useCallback(() => {
    hs.clearHistory();
    refresh();
  }, [refresh]);

  return {
    loaded,
    // Data
    medications,
    medicationLogs,
    appointments,
    vitals,
    records,
    medicines,
    ehrProfile,
    history,
    // Medication actions
    addMedication,
    editMedication,
    deleteMedication,
    markMedTaken,
    getMedStreak: hs.getMedicationStreak,
    isMedTaken: hs.isMedicationTaken,
    // Appointment actions
    addAppointment,
    editAppointment,
    deleteAppointment,
    // Vital actions
    addVital,
    deleteVital,
    // Record actions
    addRecord,
    editRecord,
    deleteRecord,
    // Medicine inventory actions
    addMedicine,
    editMedicine,
    deleteMedicine,
    // EHR profile
    saveEHR,
    // History actions
    saveSession,
    deleteSession,
    clearAllHistory,
    // Export
    downloadAll: hs.downloadHealthData,
  };
}

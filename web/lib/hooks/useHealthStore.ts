"use client";

import { useState, useCallback, useEffect } from "react";
import * as hs from "../health-store";

/**
 * React hook wrapping the health-store's localStorage CRUD.
 *
 * Re-reads from storage on mount and after every mutation so the UI
 * always reflects the latest state. All writes are synchronous and
 * local — no server calls, no loading states needed.
 */
export function useHealthStore() {
  const [medications, setMedications] = useState<hs.Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<hs.MedicationLog[]>([]);
  const [appointments, setAppointments] = useState<hs.Appointment[]>([]);
  const [vitals, setVitals] = useState<hs.VitalReading[]>([]);
  const [records, setRecords] = useState<hs.HealthRecord[]>([]);
  const [history, setHistory] = useState<hs.ConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setMedications(hs.loadMedications());
    setMedicationLogs(hs.loadMedicationLogs());
    setAppointments(hs.loadAppointments());
    setVitals(hs.loadVitals());
    setRecords(hs.loadRecords());
    setHistory(hs.loadHistory());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  // --- Medications ---
  const addMedication = useCallback(
    (med: Omit<hs.Medication, "id">) => {
      hs.saveMedication(med);
      refresh();
    },
    [refresh],
  );
  const editMedication = useCallback(
    (id: string, patch: Partial<hs.Medication>) => {
      hs.updateMedication(id, patch);
      refresh();
    },
    [refresh],
  );
  const deleteMedication = useCallback(
    (id: string) => {
      hs.removeMedication(id);
      refresh();
    },
    [refresh],
  );
  const markMedTaken = useCallback(
    (medicationId: string, date: string, time: string) => {
      hs.logMedicationTaken(medicationId, date, time);
      refresh();
    },
    [refresh],
  );

  // --- Appointments ---
  const addAppointment = useCallback(
    (appt: Omit<hs.Appointment, "id">) => {
      hs.saveAppointment(appt);
      refresh();
    },
    [refresh],
  );
  const editAppointment = useCallback(
    (id: string, patch: Partial<hs.Appointment>) => {
      hs.updateAppointment(id, patch);
      refresh();
    },
    [refresh],
  );
  const deleteAppointment = useCallback(
    (id: string) => {
      hs.removeAppointment(id);
      refresh();
    },
    [refresh],
  );

  // --- Vitals ---
  const addVital = useCallback(
    (reading: Omit<hs.VitalReading, "id">) => {
      hs.saveVital(reading);
      refresh();
    },
    [refresh],
  );
  const deleteVital = useCallback(
    (id: string) => {
      hs.removeVital(id);
      refresh();
    },
    [refresh],
  );

  // --- Records ---
  const addRecord = useCallback(
    (rec: Omit<hs.HealthRecord, "id">) => {
      hs.saveRecord(rec);
      refresh();
    },
    [refresh],
  );
  const editRecord = useCallback(
    (id: string, patch: Partial<hs.HealthRecord>) => {
      hs.updateRecord(id, patch);
      refresh();
    },
    [refresh],
  );
  const deleteRecord = useCallback(
    (id: string) => {
      hs.removeRecord(id);
      refresh();
    },
    [refresh],
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
    // History actions
    saveSession,
    deleteSession,
    clearAllHistory,
    // Export
    downloadAll: hs.downloadHealthData,
  };
}

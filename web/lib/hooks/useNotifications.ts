"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  todayISO,
  loadMedications,
  loadMedicationLogs,
  loadAppointments,
  type Medication,
  type Appointment,
} from "../health-store";

export interface Notification {
  id: string;
  type: "medication" | "appointment" | "reminder" | "info";
  title: string;
  message: string;
  time: string; // "HH:MM"
  read: boolean;
  urgent: boolean;
}

const DISMISSED_KEY = "medos_dismissed_notifications";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

/**
 * Generates today's notifications from the user's health data.
 *
 * Notifications are derived, not stored: every time the hook runs it
 * scans medications + appointments for today and creates reminders
 * for anything that's due or overdue. The user can dismiss individual
 * notifications (persisted in localStorage).
 *
 * This is a client-side-only system — no push notifications, no server
 * involvement. In the future this can be upgraded to Web Push / service
 * worker notifications.
 */
export function useNotifications() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  // Refresh every minute.
  useEffect(() => {
    setDismissed(loadDismissed());
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayISO();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const notifications: Notification[] = useMemo(() => {
    const items: Notification[] = [];
    const meds = loadMedications().filter((m) => m.active);
    const logs = loadMedicationLogs();
    const appts = loadAppointments().filter(
      (a) => a.date === today && a.status === "upcoming",
    );

    // Medication reminders — for each scheduled time today.
    for (const med of meds) {
      for (const time of med.times) {
        const [h, m] = time.split(":").map(Number);
        const medMinutes = (h || 0) * 60 + (m || 0);
        const taken = logs.some(
          (l) =>
            l.medicationId === med.id &&
            l.date === today &&
            l.time === time &&
            l.taken,
        );

        if (taken) continue; // Already taken — no notification.

        const overdue = nowMinutes > medMinutes + 30;
        const dueSoon = !overdue && nowMinutes >= medMinutes - 15;

        if (overdue || dueSoon) {
          items.push({
            id: `med-${med.id}-${time}-${today}`,
            type: "medication",
            title: overdue ? `Overdue: ${med.name}` : `Due now: ${med.name}`,
            message: `${med.dose} scheduled at ${time}`,
            time,
            read: false,
            urgent: overdue,
          });
        }
      }
    }

    // Appointment reminders — 30 min before.
    for (const appt of appts) {
      const [h, m] = appt.time.split(":").map(Number);
      const apptMinutes = (h || 0) * 60 + (m || 0);
      const in30 = apptMinutes - nowMinutes <= 30 && apptMinutes >= nowMinutes;
      const overdue = nowMinutes > apptMinutes;

      if (in30 || overdue) {
        items.push({
          id: `appt-${appt.id}-${today}`,
          type: "appointment",
          title: overdue ? `Missed: ${appt.title}` : `Coming up: ${appt.title}`,
          message: `${appt.time}${appt.doctor ? ` · ${appt.doctor}` : ""}${appt.location ? ` · ${appt.location}` : ""}`,
          time: appt.time,
          read: false,
          urgent: overdue,
        });
      }
    }

    return items.sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, tick]);

  const active = notifications.filter((n) => !dismissed.has(n.id));
  const count = active.length;

  const dismiss = useCallback(
    (id: string) => {
      const next = new Set(dismissed);
      next.add(id);
      setDismissed(next);
      saveDismissed(next);
    },
    [dismissed],
  );

  const dismissAll = useCallback(() => {
    const next = new Set(dismissed);
    for (const n of notifications) next.add(n.id);
    setDismissed(next);
    saveDismissed(next);
  }, [dismissed, notifications]);

  return { notifications: active, count, dismiss, dismissAll };
}

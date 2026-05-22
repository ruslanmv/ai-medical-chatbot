"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type FamilyMember,
  type FamilyState,
  type MedOSMode,
  type MonthlyHealthRecord,
  emptyFamilyState,
  defaultFamily,
  generateInviteCode,
  nowISO,
  SCHEMA_VERSION,
} from "@/lib/family-health";

const STORAGE_KEY = "medos.family.v1";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Persisted Family Health Tree state.
 *
 * Storage is local-only by default. Sharing happens via generated
 * invite codes; nothing is sent to the backend unless an invite is
 * accepted by another device (out of scope for this hook).
 */
export function useFamilyHealth() {
  const [state, setState] = useState<FamilyState>(emptyFamilyState);
  const [loaded, setLoaded] = useState(false);

  // ---- Load on mount ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FamilyState;
        if (parsed?.schemaVersion === SCHEMA_VERSION) {
          setState(parsed);
        }
      }
    } catch {
      // Ignore corrupted localStorage — fall back to empty state.
    }
    setLoaded(true);
  }, []);

  // ---- Persist on change (after first load) ----
  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded etc. — drop silently; the in-memory copy is
      // still authoritative for this session.
    }
  }, [state, loaded]);

  // ---- Mutators ----
  const setMode = useCallback((mode: MedOSMode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  const setCurrentMemberId = useCallback((memberId: string) => {
    setState((s) => ({ ...s, currentMemberId: memberId }));
  }, []);

  const seedDefaultFamily = useCallback(() => {
    setState((s) => {
      if (s.members.length > 0) return s;
      const members = defaultFamily();
      return {
        ...s,
        members,
        currentMemberId: members[0]?.id ?? null,
        mode: "family-admin",
      };
    });
  }, []);

  const addMember = useCallback(
    (input: Omit<FamilyMember, "id" | "createdAt" | "updatedAt">) => {
      const now = nowISO();
      const member: FamilyMember = {
        ...input,
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({
        ...s,
        members: [...s.members, member],
        currentMemberId: s.currentMemberId ?? member.id,
      }));
    },
    [],
  );

  const updateMember = useCallback(
    (memberId: string, patch: Partial<FamilyMember>) => {
      setState((s) => ({
        ...s,
        members: s.members.map((m) =>
          m.id === memberId ? { ...m, ...patch, updatedAt: nowISO() } : m,
        ),
      }));
    },
    [],
  );

  const upsertMonthlyRecord = useCallback(
    (
      input: Omit<MonthlyHealthRecord, "id" | "createdAt" | "updatedAt">,
    ) => {
      const now = nowISO();
      setState((s) => {
        const existing = s.records.find(
          (r) => r.memberId === input.memberId && r.month === input.month,
        );
        if (existing) {
          return {
            ...s,
            records: s.records.map((r) =>
              r.id === existing.id ? { ...r, ...input, updatedAt: now } : r,
            ),
          };
        }
        const record: MonthlyHealthRecord = {
          ...input,
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
          updatedAt: now,
        };
        return { ...s, records: [...s.records, record] };
      });
    },
    [],
  );

  const createInvite = useCallback(
    (memberId: string, mode: MedOSMode) => {
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
      setState((s) => ({
        ...s,
        invites: [
          ...s.invites.filter(
            (i) => new Date(i.expiresAt).getTime() > Date.now(),
          ),
          { code, memberId, mode, expiresAt },
        ],
      }));
      return { code, expiresAt };
    },
    [],
  );

  const exportData = useCallback(() => state, [state]);

  return {
    mode: state.mode,
    members: state.members,
    records: state.records,
    currentMemberId: state.currentMemberId,
    invites: state.invites,
    setMode,
    setCurrentMemberId,
    seedDefaultFamily,
    addMember,
    updateMember,
    upsertMonthlyRecord,
    createInvite,
    exportData,
  };
}

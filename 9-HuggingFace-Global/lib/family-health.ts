/**
 * MedOS Family — types, helpers, and persisted store.
 *
 * The Family Health Tree is private to the device: members, records,
 * and consent flags live in localStorage under FAMILY_KEY. This keeps
 * sensitive family data off the network unless the user explicitly
 * generates a sharing invite via createInvite() in useFamilyHealth.
 *
 * Schema versioning: bump SCHEMA_VERSION whenever the shape changes
 * and add a migration branch in load(). The current v1 schema is
 * tagged on every persisted blob so future migrations are mechanical.
 */

export type MedOSMode = "standard" | "adult" | "child" | "family-admin";

export type FamilyRelationship =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "guardian"
  | "other";

export type FamilyConsentStatus =
  | "owner"
  | "accepted"
  | "pending"
  | "guardian-managed"
  | "revoked";

export type MonthlyStatus = "good" | "watch" | "needs-care" | "unknown";

export interface FamilyMember {
  id: string;
  displayName: string;
  relationship: FamilyRelationship;
  mode: MedOSMode;
  avatarEmoji?: string;
  consentStatus: FamilyConsentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyHealthRecord {
  id: string;
  memberId: string;
  /** ISO month like "2026-05". */
  month: string;
  status: MonthlyStatus;
  symptoms: string;
  appointments: string;
  medicines: string;
  vitals: string;
  vaccines: string;
  notes: string;
  followUpNeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyInvite {
  code: string;
  memberId: string;
  mode: MedOSMode;
  expiresAt: string;
}

export interface FamilyState {
  schemaVersion: number;
  mode: MedOSMode;
  members: FamilyMember[];
  records: MonthlyHealthRecord[];
  currentMemberId: string | null;
  invites: FamilyInvite[];
}

export const SCHEMA_VERSION = 1;

const EMPTY_STATE: FamilyState = {
  schemaVersion: SCHEMA_VERSION,
  mode: "standard",
  members: [],
  records: [],
  currentMemberId: null,
  invites: [],
};

export function emptyFamilyState(): FamilyState {
  return JSON.parse(JSON.stringify(EMPTY_STATE));
}

/** ISO month string for the current calendar month (UTC). */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** 6-character invite code, uppercase alphanumeric (no ambiguous chars). */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Default family preset used by "Use sample family" — gives new users
 * something concrete to interact with instead of an empty tree.
 */
export function defaultFamily(): FamilyMember[] {
  const now = nowISO();
  return [
    {
      id: "self",
      displayName: "You",
      relationship: "self",
      mode: "family-admin",
      avatarEmoji: "🧑",
      consentStatus: "owner",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "spouse",
      displayName: "Partner",
      relationship: "spouse",
      mode: "adult",
      avatarEmoji: "🧑",
      consentStatus: "accepted",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "child-1",
      displayName: "Child",
      relationship: "child",
      mode: "child",
      avatarEmoji: "🧒",
      consentStatus: "guardian-managed",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

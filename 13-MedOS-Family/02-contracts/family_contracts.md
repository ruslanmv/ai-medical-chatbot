# Family API Contracts

These contracts are intentionally simple so they can be implemented in Next.js API routes, FastAPI, or a separate service.

## FamilyMember

```ts
type MedOSMode = "standard" | "adult" | "child" | "family-admin";
type FamilyRelationship = "self" | "spouse" | "child" | "parent" | "guardian" | "other";
type FamilyConsentStatus = "owner" | "accepted" | "pending" | "guardian-managed" | "revoked";

interface FamilyMember {
  id: string;
  displayName: string;
  relationship: FamilyRelationship;
  mode: MedOSMode;
  dateOfBirth?: string;
  avatarEmoji?: string;
  linkedClientId?: string;
  consentStatus: FamilyConsentStatus;
  createdAt: string;
  updatedAt: string;
}
```

## MonthlyHealthRecord

```ts
type MonthlyStatus = "good" | "watch" | "needs-care" | "unknown";

interface MonthlyHealthRecord {
  id: string;
  memberId: string;
  month: string; // YYYY-MM
  status: MonthlyStatus;
  symptoms?: string;
  appointments?: string;
  medicines?: string;
  vitals?: string;
  vaccines?: string;
  notes?: string;
  followUpNeeded?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## LinkInvite

```ts
interface LinkInvite {
  id: string;
  familyId: string;
  memberId: string;
  code: string;
  mode: MedOSMode;
  expiresAt: string;
  acceptedAt?: string;
}
```

## Endpoints

```text
GET    /api/family
POST   /api/family/members
PATCH  /api/family/members/:id
DELETE /api/family/members/:id
POST   /api/family/members/:id/invite
POST   /api/family/link/accept
GET    /api/family/timeline?memberId=&from=&to=
POST   /api/family/timeline
PATCH  /api/family/timeline/:id
GET    /api/family/export?memberId=&range=12m
```

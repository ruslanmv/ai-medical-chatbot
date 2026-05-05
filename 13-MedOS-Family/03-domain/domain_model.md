# Domain Model

## Aggregate roots

- Family
- FamilyMember
- MemberHealthTimeline
- ConsentGrant
- LinkInvite

## Entity rules

1. A family must have at least one admin.
2. Children must be guardian-managed.
3. Adults must explicitly accept sharing.
4. Each linked MedOS client has one primary owner profile.
5. Family admin can see child records by guardian right.
6. Family admin can see adult records only according to consent.
7. Monthly records must never claim diagnosis.

## Mode behavior

### Standard mode

A single-user MedOS experience. No family tree is shown by default.

### Adult mode

Adds sharing controls:

- link to family
- approve/revoke shared fields
- choose whether medicines, vitals, records, and appointments are visible

### Child mode

Simplifies UI:

- medicines
- appointments
- vaccines
- growth
- symptoms
- school notes
- emergency card

Parent/guardian manages the profile.

### Family Admin mode

Shows:

- family tree
- all linked members
- monthly check-in status
- alerts
- export summaries
- invite codes

## Medication reminders entities (proposed)

```ts
type MedicationReminder = {
  id: string;
  familyId: string;
  memberId: string;
  medicineName: string;
  dose?: string;
  form?: "tablet" | "syrup" | "drops" | "injection" | "cream" | "other";
  startDateTime: string;
  frequencyType: "every_x_hours" | "daily" | "weekly" | "custom";
  frequencyValue?: number;
  frequencyUnit?: "hours" | "days" | "weeks";
  durationType: "until_date" | "number_of_days" | "number_of_doses" | "ongoing";
  endDateTime?: string;
  totalDoses?: number;
  instructions?: string;
  prescribedBy?: string;
  notificationRecipients: string[];
  status: "active" | "paused" | "completed" | "cancelled";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type MedicationDoseLog = {
  id: string;
  reminderId: string;
  memberId: string;
  scheduledFor: string;
  action: "taken" | "skipped" | "snoozed" | "missed";
  actionAt?: string;
  notes?: string;
  recordedByUserId?: string;
};
```

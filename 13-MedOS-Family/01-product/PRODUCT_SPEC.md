# MedOS Family Product Spec

## Problem

Families often manage health information across paper prescriptions, screenshots, memory, messaging apps, and separate devices. Parents need a safe way to monitor monthly health events for children and optionally coordinate with adult family members.

## Solution

Create a family layer on top of MedOS where each MedOS client can link to a family admin. The family layer organizes members in a tree and shows monthly health timelines.

## Personas

### Family Admin
Usually a parent. Can create the family, add child profiles, invite adult members, monitor shared timelines, and export summaries.

### Adult Member
Owns their own MedOS profile. Can accept or decline family sharing and control which fields are visible.

### Child Profile
Managed by parent/guardian. Uses child mode with simplified screens, growth/vaccines/appointments focus, and restricted sharing.

### Clinician Guest, future
Temporary read-only access to selected records.

## Main screens

1. Family Admin dashboard
2. Family tree
3. Member health profile
4. Monthly timeline
5. Medicines per member
6. Appointments per member
7. Vitals per member
8. Documents vault per member
9. Invite/link device screen
10. Consent and permissions screen

## Monthly timeline fields

- month
- year
- overall status: good, watch, needs-care, unknown
- symptoms
- appointments
- medications changed
- vitals summary
- vaccines
- records/documents
- parent notes
- follow-up needed

## Alerts

- missing monthly check-in
- vaccine/checkup due
- medicine refill due
- repeated symptom notes
- abnormal trend flag, with no diagnosis

## UX principle

Keep MedOS simple for normal users. Show advanced family tools only in Family Admin mode.

# MedOS Connect — Notification Architecture

MedOS Connect provides phone and PWA notifications for medicine reminders, new vitals, and family-admin alerts. Notification events are **generic** so the same system serves multiple use cases — they are not hardcoded to medicine reminders.

---

## 1. Notification types

```text
medicine_due
medicine_missed
new_vital_synced
high_temperature_logged
appointment_due
daily_family_summary
```

New types can be added without schema changes — `notification_events.type` is a free-form text column.

---

## 2. Targets and platforms

A user can register one or more notification targets in `notification_targets`:

```text
pwa
ios
android
email
sms_future
```

Each target stores a platform-specific `token` (e.g., a Web Push subscription, an APNs/FCM token, or an email address). Targets are activated/deactivated rather than deleted, so historical events remain auditable.

### Registration API

```text
POST /api/notifications/register-device
```

Body:

```json
{
  "platform": "pwa",
  "token": "BFG...subscription-endpoint..."
}
```

---

## 3. Event lifecycle

```text
created (status='pending', scheduled_for=…)
   ↓
sent (status='sent', sent_at=…)
   ↓
read (status='read')      or   dismissed (status='dismissed')
```

If sending fails the event moves to `status='failed'` with an error reason captured in audit logs.

---

## 4. Payload shapes

### Medicine reminder

```json
{
  "type": "medicine_due",
  "title": "MedOS Family Reminder",
  "body": "Mario: Time for Tachipirina 500 mg.",
  "memberId": "child-1",
  "actions": ["taken", "skipped", "snooze"]
}
```

### Vital imported

```json
{
  "type": "new_vital_synced",
  "title": "New vital imported",
  "body": "Mario: Temperature 38.2 °C from Withings Thermo.",
  "memberId": "child-1"
}
```

### Daily family summary

```json
{
  "type": "daily_family_summary",
  "title": "MedOS Family — daily summary",
  "body": "2 medicines taken, 1 missed, 3 vitals synced.",
  "familyId": "family-123"
}
```

---

## 5. Reminder generation

The reminder service computes upcoming dose times from each active `medication_reminders` row and creates `notification_events` rows ahead of time (`scheduled_for` set, `status='pending'`).

```text
reminder created or updated
   ↓
reminder service computes next N dose times
   ↓
notification_events rows created for each dose
   ↓
worker sends events as scheduled_for is reached
   ↓
user marks dose taken / skipped / snoozed / missed
   ↓
medication_dose_logs row created
   ↓
if dose missed → medicine_missed notification (optionally to caregivers)
```

Snooze re-creates a new `notification_events` row at the snoozed time; it does not mutate the past one.

---

## 6. Recipient resolution

For a member-scoped event, the notification service resolves recipients from the family permission model:

```text
member themselves (if adult and not opted out)
guardians (if member is a child)
caregivers with "Can receive notifications" enabled
the family admin (depending on event type and consent)
```

Recipient resolution lives in `lib/services/notification-service.ts` and uses the same checks defined in `lib/services/family-permission-service.ts`.

---

## 7. PWA support

The existing MedOS app already has PWA support, so MedOS Connect's first notification surface is **Web Push** through the PWA. Native iOS/Android push targets are added later behind the same `notification_targets` table — no schema change required.

---

## 8. Privacy in notifications

Notification bodies must avoid leaking sensitive content beyond what the recipient is already permitted to see. The notification service:

- Uses member display names, not internal IDs.
- Omits exact values when the recipient does not have read permission for that vital (rare, but possible for caregiver scopes).
- Never includes raw provider tokens or audit metadata.

'use client';

import { TOKENS } from '../../lib/tokens';
import { Card, PageHeader } from '../Primitives';

interface Toggle { label: string; on: boolean }

const APP_PUSH: Toggle[] = [
  { label: 'Medicine dose due',          on: true },
  { label: 'Medicine dose missed',       on: true },
  { label: 'Vaccine due in 30 days',     on: true },
  { label: 'Vaccine due in 7 days',      on: true },
  { label: 'Vaccine overdue',            on: true },
  { label: 'Local outbreak alert',       on: true },
];

const EMAIL_QUIET: Toggle[] = [
  { label: 'Weekly health summary (Mon 08:00)', on: true  },
  { label: 'Vaccine due-date email',            on: true  },
  { label: 'Refill reminder',                   on: false },
  { label: 'Quiet hours · 22:00–07:00',         on: true  },
  { label: 'Reminder language · Italian',       on: true  },
];

export function RemindersPage() {
  return (
    <div data-screen-label="Desktop · Reminders">
      <PageHeader
        eyebrow="Notifications & email"
        title="Reminders"
        subtitle="Calm, controlled — never alarming. You decide when and how."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="App push reminders">
          {APP_PUSH.map((r, i) => (
            <ToggleRow key={r.label} {...r} last={i === APP_PUSH.length - 1}/>
          ))}
        </Card>
        <Card title="Email & quiet hours">
          {EMAIL_QUIET.map((r, i) => (
            <ToggleRow key={r.label} {...r} last={i === EMAIL_QUIET.length - 1}/>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({ label, on, last }: Toggle & { last: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0',
      borderBottom: last ? 'none' : `1px solid ${TOKENS.border}`,
    }}>
      <div style={{ fontSize: 13, color: TOKENS.ink }}>{label}</div>
      <div style={{
        width: 36, height: 20, borderRadius: 99,
        background: on ? TOKENS.primary : '#d8d2c5', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 16, height: 16, borderRadius: 99, background: '#fff',
        }}/>
      </div>
    </div>
  );
}

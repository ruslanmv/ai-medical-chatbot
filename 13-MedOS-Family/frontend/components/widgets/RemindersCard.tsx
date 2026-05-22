'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';

interface ToggleSpec { label: string; on: boolean }

const ROWS: ToggleSpec[] = [
  { label: 'Medicine dose reminders',                   on: true },
  { label: 'Vaccine reminders (30d, 7d, overdue)',      on: true },
  { label: 'Weekly email summary',                      on: true },
  { label: 'Local outbreak alerts',                     on: true },
  { label: 'Quiet hours · 22:00–07:00',                 on: true },
];

export function RemindersCard() {
  return (
    <Card title="Reminders & email">
      {ROWS.map((r, i) => (
        <div key={r.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: i < ROWS.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
        }}>
          <div style={{ fontSize: 13, color: TOKENS.ink }}>{r.label}</div>
          <div style={{
            width: 36, height: 20, borderRadius: 99,
            background: r.on ? TOKENS.primary : '#d8d2c5', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 2, left: r.on ? 18 : 2,
              width: 16, height: 16, borderRadius: 99, background: '#fff',
              transition: 'left .2s',
            }}/>
          </div>
        </div>
      ))}
    </Card>
  );
}

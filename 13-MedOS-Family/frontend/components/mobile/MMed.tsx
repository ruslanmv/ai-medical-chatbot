'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { TODAY_DOSES, type Dose, type DoseStatus } from '../../lib/data';
import { StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import { MCard, MHeader, mobilePrimaryBtn } from './MobileBits';

export function MMed() {
  const [doses, setDoses] = useState<Dose[]>(TODAY_DOSES);
  const mark = (id: string, status: DoseStatus) =>
    setDoses((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
      <MHeader
        sub="Medicines" title="Today"
        action={
          <button style={{ ...mobilePrimaryBtn, padding: '8px 12px' }}>
            <Icon name="plus" size={13}/> Add
          </button>
        }
      />

      <MCard title="Schedule">
        {doses.map((d, i) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderBottom: i < doses.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
          }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: TOKENS.ink, width: 50 }}>
              {d.time}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{d.med}</div>
              <div style={{ fontSize: 11, color: TOKENS.ink3 }}>{d.child} · {d.dose}</div>
            </div>
            {d.status === 'taken' ? (
              <StatusPill tone="good">✓</StatusPill>
            ) : d.status === 'due' ? (
              <button onClick={() => mark(d.id, 'taken')} style={mobilePrimaryBtn}>
                Mark taken
              </button>
            ) : (
              <StatusPill tone="muted">Later</StatusPill>
            )}
          </div>
        ))}
      </MCard>

      <MCard title="Reminders">
        <div style={{ fontSize: 12, color: TOKENS.ink2, lineHeight: 1.5 }}>
          We&apos;ll send a calm reminder a few minutes before each dose. You can pause or change
          times any time.
        </div>
      </MCard>
    </div>
  );
}

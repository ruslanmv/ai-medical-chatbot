'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { CHILDREN, TODAY_DOSES, VACCINES, type Dose, type DoseStatus } from '../../lib/data';
import { Avatar, StatusPill } from '../Primitives';
import { Icon, type IconName } from '../Icon';
import { mobilePrimaryBtn, MCard, MHeader } from './MobileBits';
import type { MTab } from './MNavBar';

interface Props { onNav: (t: MTab) => void }

export function MHome({ onNav }: Props) {
  const [doses, setDoses] = useState<Dose[]>(TODAY_DOSES);
  const mark = (id: string, status: DoseStatus) =>
    setDoses((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));

  const takenCount = doses.filter((d) => d.status === 'taken').length;

  const upcoming = [
    { v: VACCINES.aarav!.find((x) => x.status === 'due-soon')!, child: 'Leo',   days: 12 },
    { v: VACCINES.vihaan!.find((x) => x.status === 'due-soon')!, child: 'Mateo', days: 39 },
  ];

  const quickActions: Array<{ i: IconName; l: string }> = [
    { i: 'pill',    l: 'Medicine' },
    { i: 'syringe', l: 'Vaccine'  },
    { i: 'temp',    l: 'Temp'     },
    { i: 'note',    l: 'Note'     },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
      <MHeader sub="Thursday · May 7" title="Hi, Marco." action={
        <button style={{
          width: 36, height: 36, borderRadius: 99,
          border: `1px solid ${TOKENS.border}`, background: TOKENS.surface,
          color: TOKENS.ink, position: 'relative', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bell" size={16}/>
          <span style={{
            position: 'absolute', top: 8, right: 8, width: 6, height: 6,
            borderRadius: 99, background: TOKENS.coral,
          }}/>
        </button>
      }/>

      {/* Hero summary */}
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 14,
        padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, color: TOKENS.ink3, marginBottom: 6 }}>Today</div>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 19, color: TOKENS.ink,
          lineHeight: 1.3, fontWeight: 500,
        }}>
          1 dose due at 20:00.{' '}
          <span style={{ color: TOKENS.ink3 }}>Vaccine in 12 days. No urgent local alerts.</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {CHILDREN.map((c) => (
            <button key={c.id} onClick={() => onNav('kids')} style={{
              flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${TOKENS.border}`,
              background: TOKENS.surfaceMuted,
              display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
              textAlign: 'left', font: 'inherit',
            }}>
              <Avatar member={c} size={36}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{c.age}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <MCard
        title="Today's medicines"
        action={<span style={{ fontSize: 11, color: TOKENS.ink3 }}>{takenCount}/{doses.length}</span>}
      >
        {doses.map((d, i) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0',
            borderBottom: i < doses.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
          }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: TOKENS.ink, width: 46 }}>
              {d.time}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>{d.med}</div>
              <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{d.child} · {d.dose}</div>
            </div>
            {d.status === 'taken' ? (
              <StatusPill tone="good">✓ Taken</StatusPill>
            ) : d.status === 'due' ? (
              <button onClick={() => mark(d.id, 'taken')} style={mobilePrimaryBtn}>
                Mark taken
              </button>
            ) : (
              <StatusPill tone="muted">{d.status === 'snoozed' ? 'Snoozed' : 'Later'}</StatusPill>
            )}
          </div>
        ))}
      </MCard>

      <MCard title="Upcoming vaccines">
        {upcoming.map(({ v, child, days }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0',
            borderBottom: i === 0 ? `1px solid ${TOKENS.border}` : 'none',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: TOKENS.primarySoft,
              color: TOKENS.primary,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="syringe" size={15}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{child} · {v.date}</div>
            </div>
            <StatusPill tone={days < 14 ? 'watch' : 'muted'}>in {days}d</StatusPill>
          </div>
        ))}
      </MCard>

      <MCard title="Quick actions">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {quickActions.map((a) => (
            <button key={a.l} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 6px', borderRadius: 10,
              border: `1px solid ${TOKENS.border}`, background: TOKENS.surfaceMuted,
              cursor: 'pointer',
            }}>
              <div style={{ color: TOKENS.primary }}><Icon name={a.i} size={18}/></div>
              <div style={{ fontSize: 10.5, color: TOKENS.ink, fontWeight: 600 }}>{a.l}</div>
            </button>
          ))}
        </div>
      </MCard>

      <button onClick={() => onNav('alt')} style={{
        width: '100%', padding: 12, borderRadius: 12,
        border: `1px solid ${TOKENS.border}`, background: TOKENS.amberSoft,
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon name="pin" size={18} color={TOKENS.amber}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>
            Pertussis cluster · 8 km away
          </div>
          <div style={{ fontSize: 10.5, color: TOKENS.ink2 }}>
            18 cases this month · ASL Roma 1
          </div>
        </div>
        <Icon name="chevron" size={16} color={TOKENS.ink3}/>
      </button>
    </div>
  );
}

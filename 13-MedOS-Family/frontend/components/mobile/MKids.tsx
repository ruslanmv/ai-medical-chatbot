'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { CHILDREN, VACCINES } from '../../lib/data';
import { Avatar } from '../Primitives';
import { VaccineRow } from '../widgets/VaccineRow';
import { MCard, MHeader } from './MobileBits';

type Tab = 'overview' | 'vaccines' | 'medicines' | 'notes';

export function MKids() {
  const [activeChild, setActiveChild] = useState(CHILDREN[0]!.id);
  const [tab, setTab] = useState<Tab>('overview');
  const child = CHILDREN.find((c) => c.id === activeChild)!;

  const tabs: Tab[] = ['overview', 'vaccines', 'medicines', 'notes'];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
      <MHeader sub="Children" title={child.name}/>

      {/* Child switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {CHILDREN.map((c) => (
          <button key={c.id} onClick={() => setActiveChild(c.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: 10,
            borderRadius: 11,
            border: `1px solid ${activeChild === c.id ? TOKENS.primary : TOKENS.border}`,
            background: activeChild === c.id ? TOKENS.surface : TOKENS.surfaceMuted,
            cursor: 'pointer',
            boxShadow: activeChild === c.id ? `0 0 0 2px ${TOKENS.primarySoft}` : 'none',
            font: 'inherit', textAlign: 'left',
          }}>
            <Avatar member={c} size={32}/>
            <div>
              <div style={{ fontSize: 12, color: TOKENS.ink, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: TOKENS.ink3 }}>{c.age}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 12, padding: 4,
        background: TOKENS.surfaceMuted, borderRadius: 10,
        border: `1px solid ${TOKENS.border}`,
      }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px 4px', border: 'none',
            background: tab === t ? TOKENS.surface : 'transparent',
            color: tab === t ? TOKENS.ink : TOKENS.ink2,
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            borderRadius: 7, textTransform: 'capitalize',
            boxShadow: tab === t ? `0 0 0 1px ${TOKENS.border}` : 'none',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <MCard title="Vital signs · last log">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { k: 'Temp',   v: `${child.lastTemp.toFixed(1)}°C`, sub: 'May 6' },
                { k: 'Weight', v: child.weight,                     sub: 'May 1' },
                { k: 'Height', v: child.height,                     sub: 'May 1' },
                { k: 'SpO₂',   v: '98%',                            sub: 'May 6' },
              ].map((x) => (
                <div key={x.k}>
                  <div style={{ fontSize: 10, color: TOKENS.ink3, textTransform: 'uppercase', letterSpacing: 0.6 }}>{x.k}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: TOKENS.ink, marginTop: 3 }}>{x.v}</div>
                  <div style={{ fontSize: 10, color: TOKENS.ink3, marginTop: 1 }}>{x.sub}</div>
                </div>
              ))}
            </div>
          </MCard>

          <MCard title="Allergies & details">
            <div style={{ fontSize: 12, color: TOKENS.ink2, lineHeight: 1.6 }}>
              <div><b style={{ color: TOKENS.ink }}>DOB:</b> {child.dob}</div>
              <div><b style={{ color: TOKENS.ink }}>Blood:</b> {child.blood}</div>
              <div><b style={{ color: TOKENS.ink }}>Allergies:</b>{' '}
                {child.allergies.length ? child.allergies.join(', ') : 'None recorded'}</div>
              <div><b style={{ color: TOKENS.ink }}>Pediatrician:</b> Dr. M. Conti — Roma</div>
            </div>
          </MCard>

          <MCard title="Recent notes">
            {[
              { d: 'May 6',  t: 'Mild cough; resolved overnight. No fever.', a: 'Parent note' },
              { d: 'Apr 28', t: 'Routine checkup. Growth on track.',         a: 'Dr. Conti'   },
            ].map((n, i, arr) => (
              <div key={i} style={{
                padding: '9px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
              }}>
                <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{n.d} · {n.a}</div>
                <div style={{ fontSize: 12.5, color: TOKENS.ink, marginTop: 2 }}>{n.t}</div>
              </div>
            ))}
          </MCard>
        </>
      )}

      {tab === 'vaccines' && (
        <MCard title={`${child.name}'s vaccines`}>
          {VACCINES[child.id]!.map((v) => <VaccineRow key={v.name + v.date} v={v}/>)}
        </MCard>
      )}

      {tab === 'medicines' && (
        <>
          <MCard title="Active">
            {child.activeMeds.length ? (
              child.activeMeds.map((m) => (
                <div key={m} style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{m}</div>
                  <div style={{ fontSize: 11, color: TOKENS.ink3 }}>5 ml · 2× daily · 5 days remaining</div>
                  <div style={{ fontSize: 11, color: TOKENS.primary, marginTop: 4 }}>
                    Dose from prescription · Dr. Conti
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: TOKENS.ink3, padding: '4px 0' }}>No active medicines.</div>
            )}
          </MCard>
          <MCard title="History">
            <div style={{ fontSize: 12, color: TOKENS.ink2 }}>
              Amoxicillin · Mar 2026 · 7 days, completed
            </div>
          </MCard>
        </>
      )}

      {tab === 'notes' && (
        <MCard title="Health notes">
          {[
            { d: 'May 6',  t: 'Mild cough · 36.8°C',          s: 'Resolved overnight' },
            { d: 'Apr 22', t: 'Allergic rash on arms',        s: 'Antihistamine given' },
          ].map((n, i, arr) => (
            <div key={i} style={{
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
            }}>
              <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{n.d}</div>
              <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{n.t}</div>
              <div style={{ fontSize: 11.5, color: TOKENS.ink2, marginTop: 2 }}>{n.s}</div>
            </div>
          ))}
        </MCard>
      )}
    </div>
  );
}

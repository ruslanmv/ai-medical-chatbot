'use client';

import { TOKENS } from '../../lib/tokens';
import { type FamilyMember, isChild } from '../../lib/data';
import { Detail, StatusPill, toneOfStatus } from '../Primitives';
import { Icon } from '../Icon';
import { btnGhost, btnPrimary } from '../../lib/styles';

interface Props {
  m: FamilyMember | null;
  onClose: () => void;
}

export function MemberDetailModal({ m, onClose }: Props) {
  if (!m) return null;
  const child = isChild(m);
  const tone = toneOfStatus(m.status);
  const subtitle = child
    ? `Child · ${m.age} · DOB ${m.dob}`
    : `${m.role} · ${m.age} · DOB ${m.dob}`;
  const upcoming = child
    ? [{ label: m.nextVaccine.name, sub: `Vaccine · in ${m.nextVaccine.inDays} days · ${m.nextVaccine.due}` }]
    : [{ label: m.nextCheckup.name, sub: `Checkup · in ${m.nextCheckup.inDays} days · ${m.nextCheckup.due}` }];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: TOKENS.surface, borderRadius: 18, width: '100%', maxWidth: 720,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
        border: `1px solid ${TOKENS.border}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          background: `linear-gradient(135deg, ${m.avatarColor}15 0%, ${TOKENS.surfaceMuted} 100%)`,
          borderBottom: `1px solid ${TOKENS.border}`,
          display: 'flex', gap: 18, alignItems: 'center',
          borderRadius: '18px 18px 0 0',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 99, background: m.avatarColor, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 30,
            boxShadow: `0 0 0 4px ${TOKENS.surface}, 0 0 0 5px ${TOKENS.border}`,
          }}>{m.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: TOKENS.ink, fontWeight: 500 }}>
              {m.fullName || m.name}
            </div>
            <div style={{ fontSize: 13, color: TOKENS.ink2, marginTop: 4 }}>{subtitle}</div>
            <div style={{ marginTop: 8 }}><StatusPill tone={tone}>● {m.statusLabel}</StatusPill></div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 99, border: `1px solid ${TOKENS.border}`,
            background: TOKENS.surface, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: TOKENS.ink2, fontSize: 16,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Detail label="Blood group" v={m.blood}/>
            <Detail
              label={child ? 'Allergies' : 'Conditions'}
              v={(child ? (m.allergies || []) : (m.conditions || [])).join(', ') || 'None recorded'}
            />
            <Detail label="Active medicines" v={m.activeMeds.length ? m.activeMeds.join(', ') : 'None'}/>
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Upcoming</SectionLabel>
            {upcoming.map((u, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: TOKENS.surfaceMuted,
                borderRadius: 10, border: `1px solid ${TOKENS.border}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{u.label}</div>
                <div style={{ fontSize: 12, color: TOKENS.ink2, marginTop: 2 }}>{u.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Latest note</SectionLabel>
            <div style={{ fontSize: 13, color: TOKENS.ink, lineHeight: 1.5 }}>{m.lastNote || '—'}</div>
          </div>

          {child && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
              <Detail label="Last temp" v={`${m.lastTemp.toFixed(1)} °C`}/>
              <Detail label="Weight" v={m.weight}/>
              <Detail label="Height" v={m.height}/>
            </div>
          )}

          <div style={{
            display: 'flex', gap: 8,
            paddingTop: 16, borderTop: `1px solid ${TOKENS.border}`,
          }}>
            <button style={btnPrimary}><Icon name="doc" size={13}/> Open full profile</button>
            <button style={btnGhost}><Icon name="plus" size={13}/> Add record</button>
            <button style={btnGhost}><Icon name="bell" size={13}/> Reminders</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: TOKENS.ink3, textTransform: 'uppercase',
      letterSpacing: 0.8, fontWeight: 600, marginBottom: 8,
    }}>{children}</div>
  );
}

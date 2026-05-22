'use client';

import { TOKENS } from '../../lib/tokens';
import { type FamilyMember, isChild } from '../../lib/data';
import { toneOfStatus } from '../Primitives';

interface Props {
  m: FamilyMember;
  onOpen: (m: FamilyMember) => void;
  size?: 'md' | 'lg';
}

export function TreeNode({ m, onOpen, size = 'md' }: Props) {
  const tone = toneOfStatus(m.status);
  const dotColor = tone === 'good' ? TOKENS.good : tone === 'watch' ? TOKENS.amber : TOKENS.coral;
  const w = size === 'lg' ? 200 : 176;
  const av = size === 'lg' ? 56 : 48;

  return (
    <button
      onClick={() => onOpen(m)}
      style={{
        width: w, cursor: 'pointer', background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`, borderRadius: 14, padding: '14px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        position: 'relative', font: 'inherit', color: 'inherit',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = TOKENS.primary;
        el.style.boxShadow = '0 6px 20px rgba(37,99,235,0.12)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = TOKENS.border;
        el.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: av, height: av, borderRadius: 99, background: m.avatarColor, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Fraunces, serif', fontSize: av * 0.42, position: 'relative',
        boxShadow: `0 0 0 3px ${TOKENS.surface}, 0 0 0 4px ${TOKENS.border}`,
      }}>
        {m.avatar}
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 14, height: 14, borderRadius: 99, background: dotColor,
          border: `2px solid ${TOKENS.surface}`,
        }}/>
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: TOKENS.ink, marginTop: 4 }}>
        {m.fullName || m.name}
      </div>
      <div style={{ fontSize: 10.5, color: TOKENS.ink3, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600 }}>
        {!isChild(m) ? m.role.split(' · ')[0] : 'Child'}
      </div>
      <div style={{ fontSize: 11, color: TOKENS.ink2 }}>{m.age}</div>
    </button>
  );
}

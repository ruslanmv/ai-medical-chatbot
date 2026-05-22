'use client';

import { TOKENS } from '../../lib/tokens';
import { Icon } from '../Icon';

export function Topbar({ onCmd }: { onCmd?: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px',
      borderBottom: `1px solid ${TOKENS.border}`, background: TOKENS.surfaceMuted,
    }}>
      <div style={{ flex: 1, position: 'relative', maxWidth: 520 }}>
        <div style={{ position: 'absolute', left: 12, top: 9, color: TOKENS.ink3 }}>
          <Icon name="search" size={16}/>
        </div>
        <input
          placeholder="Search children, medicines, vaccines…"
          style={{
            width: '100%', padding: '8px 12px 8px 36px', borderRadius: 9,
            border: `1px solid ${TOKENS.border}`, background: TOKENS.surface,
            fontSize: 13, color: TOKENS.ink, outline: 'none',
          }}
        />
      </div>
      <div style={{ flex: 1 }}/>
      <button onClick={onCmd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderRadius: 9, border: `1px solid ${TOKENS.border}`,
        background: TOKENS.surface, fontSize: 13, fontWeight: 600, color: TOKENS.ink, cursor: 'pointer',
      }}>
        <Icon name="plus" size={15}/> Quick add
      </button>
      <button style={{
        width: 36, height: 36, borderRadius: 9, border: `1px solid ${TOKENS.border}`,
        background: TOKENS.surface, color: TOKENS.ink, cursor: 'pointer', position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="bell" size={16}/>
        <span style={{
          position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 99,
          background: TOKENS.coral,
        }}/>
      </button>
    </div>
  );
}

'use client';

import { TOKENS } from '../../lib/tokens';

interface Props {
  children: React.ReactNode;
}

export function AndroidFrame({ children }: Props) {
  return (
    <div style={{
      width: 412, height: 880, position: 'relative',
      background: TOKENS.bg, borderRadius: 36,
      boxShadow: '0 18px 50px rgba(15,23,42,0.18), 0 0 0 12px #1f2937, 0 0 0 13px #0f172a',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <StatusBar/>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div style={{
      height: 32, padding: '0 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, fontWeight: 600, color: TOKENS.ink,
      background: TOKENS.bg, position: 'relative', flexShrink: 0,
    }}>
      <span>9:41</span>
      <div style={{
        position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
        width: 18, height: 18, borderRadius: 99, background: '#1a1a1a',
      }}/>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10 }}>●●●</span>
        <span style={{
          display: 'inline-block', width: 22, height: 10, borderRadius: 2,
          border: `1px solid ${TOKENS.ink}`, position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 1, left: 1, bottom: 1, width: 14,
            background: TOKENS.ink, borderRadius: 1,
          }}/>
        </span>
      </div>
    </div>
  );
}

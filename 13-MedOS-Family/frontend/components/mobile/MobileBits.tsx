'use client';

import type { CSSProperties, ReactNode } from 'react';
import { TOKENS } from '../../lib/tokens';

// Mobile-sized card (smaller padding than Desktop Card).
export function MCard({
  title, action, children, padded = true,
}: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; padded?: boolean;
}) {
  return (
    <div style={{
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
      borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}`,
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.ink }}>{title}</div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 14 : 0 }}>{children}</div>
    </div>
  );
}

// Mobile screen header (eyebrow + title + optional action).
export function MHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{
      padding: '14px 18px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: TOKENS.bg,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {sub && (
          <div style={{
            fontSize: 11, color: TOKENS.ink3,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>{sub}</div>
        )}
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 22,
          color: TOKENS.ink, fontWeight: 500, marginTop: 2,
        }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

export const mobilePrimaryBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 12px', borderRadius: 9, border: 'none',
  background: TOKENS.primary, color: '#fff',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
};

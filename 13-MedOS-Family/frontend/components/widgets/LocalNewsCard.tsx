'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';
import { linkStyle } from '../../lib/styles';
import { NEWS } from '../../lib/data';

export function LocalNewsCard({ limit = 4 }: { limit?: number }) {
  const items = NEWS.slice(0, limit);
  return (
    <Card title="Local health news" action={<a style={linkStyle}>All news</a>}>
      {items.map((n, i) => (
        <div key={i} style={{
          padding: '11px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              background: TOKENS.lavenderSoft, color: TOKENS.lavender,
              fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
            }}>{n.tag}</span>
            <span style={{ fontSize: 11, color: TOKENS.ink3 }}>{n.source} · {n.date}</span>
          </div>
          <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 500, lineHeight: 1.4 }}>{n.title}</div>
        </div>
      ))}
    </Card>
  );
}

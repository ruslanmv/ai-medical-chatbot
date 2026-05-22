'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { NEWS } from '../../lib/data';
import { Card, PageHeader } from '../Primitives';
import { linkStyle } from '../../lib/styles';

const TAGS = ['all', 'Local', 'Seasonal', 'Vaccines', 'Outbreaks', 'Policy', 'Europe'] as const;

export function NewsPage() {
  const [filter, setFilter] = useState<typeof TAGS[number]>('all');
  const items = filter === 'all' ? NEWS : NEWS.filter((n) => n.tag === filter);

  return (
    <div data-screen-label="Desktop · News">
      <PageHeader
        eyebrow="Trusted sources only"
        title="Health news · Italia"
        subtitle="Public health updates from ECDC, WHO, Min. della Salute, ISS and your region."
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {TAGS.map((t) => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
            border: `1px solid ${TOKENS.border}`,
            background: filter === t ? TOKENS.ink : TOKENS.surface,
            color: filter === t ? '#fff' : TOKENS.ink2,
            fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {items.map((n, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: TOKENS.lavenderSoft, color: TOKENS.lavender,
                fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
              }}>{n.tag}</span>
              <span style={{ fontSize: 11, color: TOKENS.ink3 }}>{n.source} · {n.date}</span>
            </div>
            <div style={{
              fontSize: 15, color: TOKENS.ink, fontWeight: 600,
              lineHeight: 1.4, marginBottom: 8,
            }}>{n.title}</div>
            <a style={linkStyle}>Read more →</a>
          </Card>
        ))}
      </div>
    </div>
  );
}

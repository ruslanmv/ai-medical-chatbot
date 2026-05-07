'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { NEWS } from '../../lib/data';
import { Card, PageHeader } from '../Primitives';
import { SeasonalCard } from '../widgets/SeasonalCard';
import { OutbreakCard } from '../widgets/OutbreakCard';

type Tab = 'seasonal' | 'outbreak' | 'news';

export function SeasonalPage() {
  const [tab, setTab] = useState<Tab>('seasonal');
  const tabs: Array<[Tab, string]> = [
    ['seasonal', 'Seasonal'],
    ['outbreak', 'Local outbreaks'],
    ['news',     'Health news'],
  ];

  return (
    <div data-screen-label="Desktop · Seasonal">
      <PageHeader
        eyebrow="ECDC · WHO · Min. della Salute"
        title="Alerts & local watch"
        subtitle="Trusted sources only. Non-diagnostic guidance for parents."
      />

      <div style={{
        display: 'flex', gap: 4, marginBottom: 14, padding: 4,
        background: TOKENS.surfaceMuted, borderRadius: 10,
        border: `1px solid ${TOKENS.border}`, width: 'fit-content',
      }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === k ? TOKENS.surface : 'transparent',
            boxShadow: tab === k ? `inset 0 0 0 1px ${TOKENS.border}` : 'none',
            fontSize: 13, fontWeight: 600, color: tab === k ? TOKENS.ink : TOKENS.ink2,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'seasonal' && <SeasonalCard/>}
      {tab === 'outbreak' && <OutbreakCard/>}
      {tab === 'news' && (
        <Card title="Local health news">
          {NEWS.map((n, i) => (
            <div key={i} style={{
              padding: '14px 0',
              borderBottom: i < NEWS.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  background: TOKENS.lavenderSoft, color: TOKENS.lavender,
                  fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                }}>{n.tag}</span>
                <span style={{ fontSize: 11, color: TOKENS.ink3 }}>{n.source} · {n.date}</span>
              </div>
              <div style={{ fontSize: 14, color: TOKENS.ink, fontWeight: 500 }}>{n.title}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { LOCAL_ALERTS, NEWS, OUTBREAKS, SEASONAL } from '../../lib/data';
import { RiskDot, StatusPill } from '../Primitives';
import { Icon, type IconName } from '../Icon';
import { MCard, MHeader } from './MobileBits';

type Tab = 'seasonal' | 'outbreaks' | 'news';

export function MAlerts() {
  const [tab, setTab] = useState<Tab>('seasonal');
  const tabs: Array<[Tab, string]> = [
    ['seasonal',  'Seasonal'],
    ['outbreaks', 'Outbreaks'],
    ['news',      'News'],
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
      <MHeader sub="Local watch · Roma" title="Alerts"/>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 12, padding: 4,
        background: TOKENS.surfaceMuted, borderRadius: 10,
        border: `1px solid ${TOKENS.border}`,
      }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: '7px 4px', border: 'none',
            background: tab === k ? TOKENS.surface : 'transparent',
            color: tab === k ? TOKENS.ink : TOKENS.ink2,
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            borderRadius: 7,
            boxShadow: tab === k ? `0 0 0 1px ${TOKENS.border}` : 'none',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'seasonal' && (
        <MCard title="Late spring · Roma">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SEASONAL.map((s) => {
              const c = (s.level === 'good' || s.level === 'low') ? TOKENS.good
                      : s.level === 'moderate' ? TOKENS.amber : TOKENS.coral;
              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: 10, borderRadius: 9,
                  background: TOKENS.surfaceMuted, border: `1px solid ${TOKENS.border}`,
                }}>
                  <div style={{ color: TOKENS.primary, marginTop: 1 }}>
                    <Icon name={s.icon as IconName} size={16}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    }}>
                      <span style={{ fontSize: 12, color: TOKENS.ink, fontWeight: 600 }}>{s.label}</span>
                      <span style={{
                        fontSize: 10, textTransform: 'capitalize',
                        color: c, fontWeight: 600,
                      }}>{s.level}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: TOKENS.ink2, marginTop: 3, lineHeight: 1.4 }}>
                      {s.tip}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </MCard>
      )}

      {tab === 'outbreaks' && (
        <>
          {LOCAL_ALERTS.slice(0, 2).map((a, i) => (
            <MCard key={i}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <StatusPill tone={a.priority === 'high' ? 'care' : 'watch'}>
                  {a.priority === 'high' ? 'Active warning' : 'Watch'}
                </StatusPill>
                <span style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{a.date}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>
                {a.title}
              </div>
              <div style={{ fontSize: 11.5, color: TOKENS.ink2, lineHeight: 1.5 }}>{a.body}</div>
              <div style={{ fontSize: 10.5, color: TOKENS.ink3, marginTop: 6 }}>Source · {a.source}</div>
            </MCard>
          ))}
          <MCard title="Local outbreak watch">
            {OUTBREAKS.map((o, i) => (
              <div key={o.name} style={{
                display: 'grid', gridTemplateColumns: '14px 1fr auto', gap: 10, alignItems: 'center',
                padding: '8px 0',
                borderBottom: i === OUTBREAKS.length - 1 ? 'none' : `1px solid ${TOKENS.border}`,
              }}>
                <RiskDot level={o.risk}/>
                <div>
                  <div style={{ fontSize: 12, color: TOKENS.ink, fontWeight: 600 }}>{o.name}</div>
                  <div style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{o.source}</div>
                </div>
                <StatusPill tone={o.risk === 'low' ? 'good' : o.risk === 'moderate' ? 'watch' : 'care'}>
                  {o.risk}
                </StatusPill>
              </div>
            ))}
          </MCard>
        </>
      )}

      {tab === 'news' && (
        <MCard title="Health news · Italia">
          {NEWS.slice(0, 6).map((n, i) => (
            <div key={i} style={{
              padding: '11px 0',
              borderBottom: i < 5 ? `1px solid ${TOKENS.border}` : 'none',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
                  background: TOKENS.lavenderSoft, color: TOKENS.lavender,
                  fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                }}>{n.tag}</span>
                <span style={{ fontSize: 10.5, color: TOKENS.ink3 }}>{n.source} · {n.date}</span>
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 500, lineHeight: 1.4 }}>
                {n.title}
              </div>
            </div>
          ))}
        </MCard>
      )}
    </div>
  );
}

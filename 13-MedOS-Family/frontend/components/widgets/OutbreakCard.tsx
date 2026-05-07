'use client';

import { TOKENS } from '../../lib/tokens';
import { Card, RiskDot, StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import { linkStyle } from '../../lib/styles';
import { OUTBREAKS } from '../../lib/data';

export function OutbreakCard() {
  return (
    <Card title="Local outbreak watch · Roma, IT" action={<a style={linkStyle}>Sources</a>}>
      <div style={{
        position: 'relative', height: 140, borderRadius: 10, overflow: 'hidden',
        background: 'repeating-linear-gradient(45deg, #f1ede2, #f1ede2 6px, #ebe6d8 6px, #ebe6d8 12px)',
        border: `1px solid ${TOKENS.border}`, marginBottom: 14,
      }}>
        <svg width="100%" height="100%" viewBox="0 0 360 140" style={{ position: 'absolute', inset: 0 }}>
          <path d="M0 80 Q 60 60 130 75 T 280 70 T 360 80" stroke="#d8d2c5" strokeWidth="1.5" fill="none"/>
          <path d="M0 110 Q 90 95 180 105 T 360 110" stroke="#d8d2c5" strokeWidth="1.2" fill="none"/>
          <circle cx="180" cy="70" r="36" fill={TOKENS.coral} opacity="0.12"/>
          <circle cx="180" cy="70" r="22" fill={TOKENS.coral} opacity="0.18"/>
          <circle cx="240" cy="55" r="20" fill={TOKENS.amber} opacity="0.18"/>
        </svg>
        <div style={{ position: 'absolute', left: 175, top: 60, color: TOKENS.coral }}>
          <Icon name="pin" size={22} stroke={2}/>
        </div>
        <div style={{
          position: 'absolute', right: 14, top: 12, background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, color: TOKENS.ink }}>Pertussis cluster</div>
          <div style={{ color: TOKENS.ink3, marginTop: 2 }}>8 km · 18 cases</div>
        </div>
      </div>

      {OUTBREAKS.map((o, i) => (
        <div key={o.name} style={{
          display: 'grid', gridTemplateColumns: '14px 1fr auto auto', gap: 12, alignItems: 'center',
          padding: '9px 0',
          borderBottom: i === OUTBREAKS.length - 1 ? 'none' : `1px solid ${TOKENS.border}`,
        }}>
          <RiskDot level={o.risk}/>
          <div>
            <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{o.name}</div>
            <div style={{ fontSize: 11, color: TOKENS.ink3 }}>{o.source}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: TOKENS.ink3 }}>
            <Icon name={o.trend === 'rising' ? 'trend-up' : o.trend === 'falling' ? 'trend-down' : 'trend-flat'} size={14}/>
            {o.trend}
          </div>
          <StatusPill tone={o.risk === 'low' ? 'good' : o.risk === 'moderate' ? 'watch' : 'care'}>{o.risk}</StatusPill>
        </div>
      ))}
    </Card>
  );
}

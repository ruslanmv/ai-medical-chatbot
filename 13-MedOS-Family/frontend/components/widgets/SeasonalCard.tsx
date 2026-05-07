'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';
import { Icon, type IconName } from '../Icon';
import { linkStyle } from '../../lib/styles';
import { SEASONAL } from '../../lib/data';
import { WeatherStrip } from './WeatherStrip';

export function SeasonalCard() {
  return (
    <Card title="Seasonal watch · Late spring · Roma" action={<a style={linkStyle}>Open guide</a>}>
      <WeatherStrip/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {SEASONAL.map((s) => {
          const tone = s.level === 'good' || s.level === 'low'
            ? TOKENS.good
            : s.level === 'moderate' ? TOKENS.amber : TOKENS.coral;
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10,
              background: TOKENS.surfaceMuted, borderRadius: 9, border: `1px solid ${TOKENS.border}`,
            }}>
              <div style={{ color: TOKENS.primary, marginTop: 1 }}>
                <Icon name={s.icon as IconName} size={18}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{s.label}</span>
                  <span style={{
                    fontSize: 11, textTransform: 'capitalize',
                    color: tone, fontWeight: 600,
                  }}>{s.level}</span>
                </div>
                <div style={{ fontSize: 11.5, color: TOKENS.ink2, marginTop: 3, lineHeight: 1.45 }}>{s.tip}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

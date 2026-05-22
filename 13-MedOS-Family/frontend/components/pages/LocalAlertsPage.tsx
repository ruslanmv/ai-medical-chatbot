'use client';

import { TOKENS } from '../../lib/tokens';
import { LOCAL_ALERTS } from '../../lib/data';
import { btnGhost } from '../../lib/styles';
import { Card, PageHeader, StatusPill } from '../Primitives';
import { Icon, type IconName } from '../Icon';
import { OutbreakCard } from '../widgets/OutbreakCard';

const TONES = { high: 'care', medium: 'watch', low: 'good' } as const;
const ICONS: Record<'health' | 'outbreak' | 'air' | 'pollen', IconName> = {
  health: 'sun', outbreak: 'bug', air: 'wind', pollen: 'leaf',
};
const PRIORITY_LABEL = {
  high: 'Active warning', medium: 'Watch', low: 'Notice',
} as const;

export function LocalAlertsPage() {
  return (
    <div data-screen-label="Desktop · Local Alerts">
      <PageHeader
        eyebrow="Roma · Lazio · Italia"
        title="Local health alerts"
        subtitle="Active advisories from Min. della Salute, ISS, Regione Lazio and ASL Roma 1."
        action={<button style={btnGhost}><Icon name="map" size={13}/> View map</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {LOCAL_ALERTS.map((a, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9, background: TOKENS.primarySoft,
                color: TOKENS.primary, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={ICONS[a.type]} size={19}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StatusPill tone={TONES[a.priority]}>{PRIORITY_LABEL[a.priority]}</StatusPill>
                  <span style={{ fontSize: 11, color: TOKENS.ink3 }}>{a.date}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: TOKENS.ink2, lineHeight: 1.5 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: TOKENS.ink3, marginTop: 8 }}>Source · {a.source}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <OutbreakCard/>
    </div>
  );
}

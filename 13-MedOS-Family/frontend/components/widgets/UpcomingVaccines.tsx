'use client';

import { TOKENS } from '../../lib/tokens';
import { Card, StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import { linkStyle } from '../../lib/styles';
import { VACCINES, type VaccineRow as V } from '../../lib/data';

interface Row extends Partial<V> {
  child: string;
}

export function UpcomingVaccines() {
  const rows: Row[] = [
    { ...VACCINES.aarav!.find((v) => v.status === 'due-soon')!, child: 'Leo' },
    ...VACCINES.aarav!.filter((v) => v.status === 'planned').slice(0, 1).map((v) => ({ ...v, child: 'Leo' })),
    { ...VACCINES.vihaan!.find((v) => v.status === 'due-soon')!, child: 'Mateo' },
  ];

  return (
    <Card title="Upcoming vaccines" action={<a style={linkStyle}>All schedules</a>}>
      {rows.map((v, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 0', borderBottom: i < rows.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: TOKENS.primarySoft,
            color: TOKENS.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="syringe" size={17}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{v.name}</div>
            <div style={{ fontSize: 11.5, color: TOKENS.ink3 }}>{v.child} · {v.date}</div>
          </div>
          <StatusPill tone={v.status === 'due-soon' ? 'watch' : 'muted'}>
            {v.status === 'due-soon' ? 'Due soon' : 'Planned'}
          </StatusPill>
        </div>
      ))}
      <div style={{
        marginTop: 12, padding: 10, background: TOKENS.surfaceMuted,
        borderRadius: 8, fontSize: 11, color: TOKENS.ink3, lineHeight: 1.5,
      }}>
        Schedules are guidance only. Confirm with your pediatrician or local ASL.
      </div>
    </Card>
  );
}

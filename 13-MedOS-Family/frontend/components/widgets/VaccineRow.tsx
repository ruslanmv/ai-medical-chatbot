'use client';

import { TOKENS } from '../../lib/tokens';
import { StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import type { VaccineRow as V } from '../../lib/data';

export function VaccineRow({ v }: { v: V }) {
  const tone = v.status === 'done'     ? 'good'
            : v.status === 'due-soon' ? 'watch'
            : v.status === 'overdue'  ? 'care' : 'muted';
  const label = v.status === 'done'     ? 'Done'
              : v.status === 'due-soon' ? 'Due soon'
              : v.status === 'overdue'  ? 'Overdue' : 'Planned';
  const dot = v.status === 'done'     ? TOKENS.good
            : v.status === 'due-soon' ? TOKENS.amber
            : v.status === 'overdue'  ? TOKENS.coral : '#dcd6c8';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: 12, alignItems: 'center',
      padding: '9px 0', borderBottom: `1px solid ${TOKENS.border}`,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 99,
        background: dot, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {v.status === 'done' && <Icon name="check" size={11} stroke={2.5}/>}
      </div>
      <div>
        <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{v.name}</div>
        <div style={{ fontSize: 11, color: TOKENS.ink3 }}>Age {v.age}</div>
      </div>
      <div style={{ fontSize: 12, color: TOKENS.ink2 }}>{v.date}</div>
      <StatusPill tone={tone}>{label}</StatusPill>
    </div>
  );
}

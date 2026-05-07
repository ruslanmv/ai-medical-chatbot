'use client';

import { TOKENS } from '../../lib/tokens';
import { iconBtn } from '../../lib/styles';
import { StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import type { Dose, DoseStatus } from '../../lib/data';

interface Props {
  dose: Dose;
  onMark: (id: string, status: DoseStatus) => void;
}

export function DoseRow({ dose, onMark }: Props) {
  const tone = dose.status === 'taken' ? 'good'
            : dose.status === 'due'    ? 'watch'
            : dose.status === 'missed' ? 'care' : 'muted';
  const label = dose.status === 'taken' ? 'Taken'
              : dose.status === 'due'    ? 'Due now'
              : dose.status === 'missed' ? 'Missed' : 'Upcoming';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 1fr auto auto', gap: 14, alignItems: 'center',
      padding: '10px 0', borderBottom: `1px solid ${TOKENS.border}`,
    }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: TOKENS.ink }}>{dose.time}</div>
      <div>
        <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{dose.med}</div>
        <div style={{ fontSize: 12, color: TOKENS.ink3 }}>{dose.child} · {dose.dose}</div>
      </div>
      <StatusPill tone={tone}>{label}</StatusPill>
      <div style={{ display: 'flex', gap: 4 }}>
        {dose.status !== 'taken' ? (
          <>
            <button title="Mark taken" onClick={() => onMark(dose.id, 'taken')} style={iconBtn(TOKENS.good)}>
              <Icon name="check" size={14}/>
            </button>
            <button title="Snooze" onClick={() => onMark(dose.id, 'snoozed')} style={iconBtn(TOKENS.amber)}>
              <Icon name="snooze" size={14}/>
            </button>
            <button title="Skip" onClick={() => onMark(dose.id, 'skipped')} style={iconBtn(TOKENS.ink3)}>
              <Icon name="skip" size={14}/>
            </button>
          </>
        ) : (
          <span style={{ fontSize: 11, color: TOKENS.ink3 }}>Logged 08:02</span>
        )}
      </div>
    </div>
  );
}

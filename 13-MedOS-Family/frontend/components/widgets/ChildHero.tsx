'use client';

import { TOKENS } from '../../lib/tokens';
import type { Child } from '../../lib/data';
import { Avatar, StatusPill, toneOfStatus } from '../Primitives';
import { Icon } from '../Icon';
import { btnGhost, btnPrimary } from '../../lib/styles';

interface Props {
  child: Child;
  onLog?: (id: string) => void;
  onView?: (id: string) => void;
}

export function ChildHero({ child, onLog, onView }: Props) {
  const tone = toneOfStatus(child.status);
  return (
    <div style={{
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 14,
      padding: 22, display: 'flex', gap: 20, alignItems: 'flex-start',
    }}>
      <Avatar member={child} size={64}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, color: TOKENS.ink, fontWeight: 500 }}>{child.name}</div>
          <div style={{ fontSize: 13, color: TOKENS.ink3 }}>{child.age} · {child.blood}</div>
          <StatusPill tone={tone}>● {child.statusLabel}</StatusPill>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
          <Block
            label="Next vaccine"
            primary={child.nextVaccine.name}
            secondary={`in ${child.nextVaccine.inDays} days · ${child.nextVaccine.due}`}
          />
          <Block
            label="Active medicines"
            primary={child.activeMeds.length ? child.activeMeds[0]! : 'None'}
            secondary={child.activeMeds.length ? `${child.activeMeds.length} active` : 'No prescriptions'}
          />
          <Block
            label="Last note"
            primary={child.lastNote}
            secondary={`Temp ${child.lastTemp.toFixed(1)} °C · ${child.weight}`}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onView?.(child.id)} style={btnGhost}>
          <Icon name="kids" size={14}/> Profile
        </button>
        <button onClick={() => onLog?.(child.id)} style={btnPrimary}>
          <Icon name="plus" size={14}/> Log
        </button>
      </div>
    </div>
  );
}

function Block({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: TOKENS.ink3, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 14, color: TOKENS.ink, fontWeight: 600, marginTop: 4 }}>{primary}</div>
      <div style={{ fontSize: 12, color: TOKENS.ink2, marginTop: 2 }}>{secondary}</div>
    </div>
  );
}

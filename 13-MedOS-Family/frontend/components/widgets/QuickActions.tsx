'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';
import { Icon, type IconName } from '../Icon';

interface Action { id: string; icon: IconName; label: string }

const ACTIONS: Action[] = [
  { id: 'med', icon: 'pill',    label: 'Add medicine' },
  { id: 'vac', icon: 'syringe', label: 'Add vaccine' },
  { id: 'sym', icon: 'note',    label: 'Log symptom' },
  { id: 'tmp', icon: 'temp',    label: 'Log temperature' },
  { id: 'app', icon: 'clock',   label: 'Add appointment' },
  { id: 'doc', icon: 'doc',     label: 'Doctor summary' },
];

export function QuickActions({ onAct }: { onAct?: (id: string) => void }) {
  return (
    <Card title="Quick actions">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ACTIONS.map((a) => (
          <button key={a.id} onClick={() => onAct?.(a.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
            padding: 12, borderRadius: 10, border: `1px solid ${TOKENS.border}`,
            background: TOKENS.surfaceMuted, cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: TOKENS.primarySoft,
              color: TOKENS.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={a.icon} size={16}/></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: TOKENS.ink }}>{a.label}</div>
          </button>
        ))}
      </div>
    </Card>
  );
}

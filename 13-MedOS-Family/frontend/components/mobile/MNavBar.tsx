'use client';

import { TOKENS } from '../../lib/tokens';
import { Icon, type IconName } from '../Icon';

export type MTab = 'home' | 'kids' | 'vac' | 'med' | 'alt';

const TABS: Array<{ id: MTab; icon: IconName; label: string }> = [
  { id: 'home', icon: 'home',    label: 'Home'      },
  { id: 'kids', icon: 'kids',    label: 'Children'  },
  { id: 'vac',  icon: 'syringe', label: 'Vaccines'  },
  { id: 'med',  icon: 'pill',    label: 'Medicines' },
  { id: 'alt',  icon: 'alert',   label: 'Alerts'    },
];

interface Props {
  active: MTab;
  onChange: (t: MTab) => void;
}

export function MNavBar({ active, onChange }: Props) {
  return (
    <div style={{
      display: 'flex', borderTop: `1px solid ${TOKENS.border}`,
      background: TOKENS.surface, padding: '8px 4px 14px', flexShrink: 0,
    }}>
      {TABS.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 4px',
        }}>
          <div style={{
            color: active === t.id ? TOKENS.primary : TOKENS.ink3,
            background: active === t.id ? TOKENS.primarySoft : 'transparent',
            borderRadius: 99, padding: '4px 14px',
          }}>
            <Icon name={t.icon} size={18} stroke={active === t.id ? 2 : 1.7}/>
          </div>
          <span style={{
            fontSize: 10.5,
            color: active === t.id ? TOKENS.ink : TOKENS.ink3,
            fontWeight: active === t.id ? 600 : 500,
          }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

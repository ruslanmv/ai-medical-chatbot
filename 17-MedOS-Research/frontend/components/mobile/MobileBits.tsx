'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import { TAG_TONES, type TagTone } from '../../lib/data';

export type MTab = 'home' | 'projects' | 'lit' | 'safety' | 'more';

interface NavItem { k: MTab; l: string; i: IconName }

const NAV_ITEMS: NavItem[] = [
  { k: 'home',     l: 'Home',       i: 'Home'    },
  { k: 'projects', l: 'Projects',   i: 'Folder'  },
  { k: 'lit',      l: 'Literature', i: 'Book'    },
  { k: 'safety',   l: 'Safety',     i: 'Shield'  },
  { k: 'more',     l: 'More',       i: 'MoreHorizontal' },
];

export function MNavBar({ active, onChange }: { active: MTab; onChange: (t: MTab) => void }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', background: '#fff',
      padding: '8px 4px 6px', display: 'flex', flexShrink: 0,
    }}>
      {NAV_ITEMS.map((it) => {
        const on = active === it.k;
        return (
          <button key={it.k} onClick={() => onChange(it.k)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
            color: on ? 'var(--brand-600)' : 'var(--ink-3)',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
            <div style={{
              padding: '4px 14px', borderRadius: 999,
              background: on ? 'var(--brand-50)' : 'transparent',
            }}>
              <Icon name={it.i} size={20} strokeWidth={on ? 2.2 : 1.7}/>
            </div>
            <div style={{ fontSize: 11, fontWeight: on ? 600 : 500 }}>{it.l}</div>
          </button>
        );
      })}
    </div>
  );
}

export function MTopBar({
  title, left = 'menu', right,
}: {
  title: ReactNode; left?: 'menu' | 'back'; right?: ReactNode;
}) {
  return (
    <div style={{
      height: 56, padding: '0 8px', display: 'flex',
      alignItems: 'center', gap: 4,
      background: '#fff', borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <button style={{
        width: 40, height: 40, border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 999, cursor: 'pointer', color: 'var(--ink-2)',
      }}>
        {left === 'back' ? <Icon name="ChevronLeft" size={22}/> : <Icon name="Menu" size={22}/>}
      </button>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {typeof title === 'string'
          ? <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
          : title}
      </div>
      {right ?? <div style={{ width: 40 }}/>}
    </div>
  );
}

export function Tag2({ tone, children }: { tone: TagTone; children: ReactNode }) {
  const t = TAG_TONES[tone] || TAG_TONES.clinical;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
      background: t.bg, color: t.fg,
    }}>{children}</span>
  );
}

export function MetricCard({
  icon, iconBg, iconFg, label, value, sub, subTone,
}: {
  icon: IconName; iconBg: string; iconFg: string;
  label: string; value: string; sub: string;
  subTone?: 'green' | 'orange' | 'muted';
}) {
  const subColor =
    subTone === 'green' ? '#16a34a'
    : subTone === 'orange' ? '#d97706'
    : 'var(--ink-3)';

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: iconBg, color: iconFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={icon} size={15}/></div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, color: subColor, fontWeight: 500, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export function QuickAction({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '12px 6px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      textAlign: 'center',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--brand-50)', color: 'var(--brand-600)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={18}/></div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

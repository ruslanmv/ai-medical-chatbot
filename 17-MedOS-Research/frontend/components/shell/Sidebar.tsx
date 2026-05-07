'use client';

import { useState } from 'react';
import { SIDEBAR_ITEMS, type NavId } from '../../lib/nav';
import { Icon } from '../Icon';
import { MedOSLogo } from './MedOSLogo';
import { UserMenu } from './UserMenu';

interface Props {
  active: NavId;
  onChange: (id: NavId) => void;
}

export function Sidebar({ active, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside style={{
      width: 248, flexShrink: 0, background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{ padding: '20px 18px 16px' }}>
        <MedOSLogo/>
      </div>
      <nav style={{
        padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2,
        flex: 1, overflow: 'auto',
      }}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                border: 'none',
                background: isActive ? 'var(--brand-50)' : 'transparent',
                color: isActive ? 'var(--brand-600)' : 'var(--ink-2)',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!isActive) el.style.background = 'var(--slate-50)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!isActive) el.style.background = 'transparent';
              }}
            >
              <Icon name={item.icon} size={18} strokeWidth={isActive ? 2 : 1.7}/>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User dropdown anchored to the bottom of the sidebar */}
      <div style={{
        padding: 10, borderTop: '1px solid var(--border)', position: 'relative',
      }}>
        {menuOpen && <UserMenu onClose={() => setMenuOpen(false)}/>}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 12,
            border: 'none', background: menuOpen ? 'var(--slate-50)' : 'transparent',
            cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            if (!menuOpen) el.style.background = 'var(--slate-50)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            if (!menuOpen) el.style.background = 'transparent';
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #fde68a, #fb923c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#7c2d12', fontWeight: 700, fontSize: 14,
          }}>AS</div>
          <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Arjun Sharma
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                background: 'var(--brand-50)', color: 'var(--brand-600)', letterSpacing: 0.3,
              }}>PRO</span>
            </div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>Principal Investigator</div>
          </div>
          <Icon name="MoreHorizontal" size={16} stroke="var(--ink-3)"/>
        </button>
      </div>
    </aside>
  );
}

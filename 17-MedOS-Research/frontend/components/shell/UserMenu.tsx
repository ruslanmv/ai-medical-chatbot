'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

interface Props { onClose: () => void }

export function UserMenu({ onClose }: Props) {
  const Item = ({
    icon, label, sub, danger, accent,
  }: {
    icon: IconName; label: string; sub?: string; danger?: boolean; accent?: boolean;
  }) => (
    <button onClick={onClose} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 8, border: 'none',
      background: 'transparent',
      color: danger ? '#dc2626' : accent ? 'var(--brand-600)' : 'var(--ink-2)',
      fontSize: 13, fontWeight: accent ? 600 : 500, cursor: 'pointer',
      textAlign: 'left',
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = danger ? '#fef2f2' : 'var(--slate-50)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = 'transparent';
      }}>
      <Icon name={icon} size={16}/>
      <div style={{ flex: 1 }}>
        <div>{label}</div>
        {sub && (
          <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 400, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  );

  const Divider = () => (
    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30 }}/>
      <div style={{
        position: 'absolute', bottom: 'calc(100% - 4px)', left: 10, right: 10,
        background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 20px 40px rgba(15,23,42,.16), 0 0 0 1px rgba(15,23,42,.04)',
        padding: 6, zIndex: 40,
      }}>
        <Header/>
        <Item icon="Sparkles"   label="Upgrade plan"     sub="Compare Pro, Team & Enterprise" accent/>
        <Divider/>
        <Item icon="Lightbulb"  label="Personalization"  sub="Custom instructions, memory"/>
        <Item icon="Users"      label="Profile"          sub="Name, email, account info"/>
        <Item icon="Settings"   label="Settings"         sub="Appearance, language, data controls"/>
        <Divider/>
        <Item icon="HelpCircle" label="Help & support"/>
        <Divider/>
        <Item icon="ArrowUpRight" label="Log out" danger/>
      </div>
    </>
  );
}

function Header({ children }: { children?: ReactNode } = {}) {
  return (
    <div style={{
      padding: '10px 10px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4,
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 2 }}>Signed in as</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>arjun.sharma@medos.research</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: 'var(--brand-50)', color: 'var(--brand-600)',
        }}>Pro plan</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· 7 seats</span>
      </div>
      {children}
    </div>
  );
}

'use client';

import { TOKENS } from '../../lib/tokens';
import { NAV, type NavId, type SettingsSection } from '../../lib/nav';
import { Icon, type IconName } from '../Icon';
import { UserDropdown } from './UserDropdown';

interface Props {
  active: NavId;
  onNav: (target: NavId | `settings:${SettingsSection}`) => void;
  userOpen: boolean;
  onUserToggle: (open: boolean) => void;
}

export function Sidebar({ active, onNav, userOpen, onUserToggle }: Props) {
  return (
    <aside style={{
      width: 232, padding: '24px 16px 16px',
      borderRight: `1px solid ${TOKENS.border}`,
      background: TOKENS.surfaceMuted,
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
        <Icon name="logo" size={32}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 19, color: TOKENS.ink, fontWeight: 700, letterSpacing: -0.3 }}>MedOS</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 19, color: TOKENS.primary, fontWeight: 500, letterSpacing: -0.3 }}>Family</span>
        </div>
      </div>

      {NAV.map((it) => (
        <button key={it.id} onClick={() => onNav(it.id)} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
          borderRadius: 9, border: 'none',
          background: active === it.id ? TOKENS.surface : 'transparent',
          boxShadow: active === it.id ? `inset 0 0 0 1px ${TOKENS.border}` : 'none',
          color: active === it.id ? TOKENS.ink : TOKENS.ink2,
          fontSize: 14, fontWeight: active === it.id ? 600 : 500,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <Icon name={it.icon as IconName} size={18} stroke={1.7}/>
          {it.label}
        </button>
      ))}

      <div style={{ flex: 1 }}/>

      <UserDropdown open={userOpen} onClose={() => onUserToggle(false)} onNav={onNav}/>

      <button onClick={() => onUserToggle(!userOpen)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        background: userOpen ? TOKENS.surface : 'transparent',
        border: `1px solid ${userOpen ? TOKENS.border : 'transparent'}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 99, background: '#2a4a4a', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 14, flexShrink: 0,
        }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, lineHeight: 1.1 }}>Marco Romano</div>
          <div style={{ fontSize: 11, color: TOKENS.ink3, marginTop: 2 }}>Family · Free plan</div>
        </div>
        <Icon name="chevron-up" size={14}/>
      </button>
    </aside>
  );
}

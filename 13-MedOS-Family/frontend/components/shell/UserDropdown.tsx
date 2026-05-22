'use client';

import { TOKENS } from '../../lib/tokens';
import { Icon, type IconName } from '../Icon';
import type { NavId, SettingsSection } from '../../lib/nav';

interface Props {
  open: boolean;
  onClose: () => void;
  onNav: (target: NavId | `settings:${SettingsSection}`) => void;
}

export function UserDropdown({ open, onClose, onNav }: Props) {
  if (!open) return null;

  const Section = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <div style={{ padding: '6px 0', borderBottom: last ? 'none' : `1px solid ${TOKENS.border}` }}>
      {children}
    </div>
  );

  const Item = ({
    icon, label, sub, danger, target,
  }: {
    icon: IconName; label: string; sub?: string; danger?: boolean;
    target: NavId | `settings:${SettingsSection}`;
  }) => (
    <button onClick={() => { onNav(target); onClose(); }} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
      color: danger ? TOKENS.coral : TOKENS.ink, fontSize: 13, fontWeight: 500,
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = TOKENS.surfaceMuted; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
      <Icon name={icon} size={15} stroke={1.7}/>
      <span style={{ flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 11, color: TOKENS.ink3 }}>{sub}</span>}
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
      <div style={{
        position: 'absolute', bottom: 64, left: 12, right: 12, zIndex: 41,
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
        borderRadius: 12, boxShadow: '0 18px 40px rgba(40,30,15,.18)',
        padding: 6, fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <Section>
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 99, background: '#2a4a4a', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 16,
            }}>M</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, lineHeight: 1.1 }}>Marco Romano</div>
              <div style={{ fontSize: 11, color: TOKENS.ink3, marginTop: 2 }}>marco.romano@email.it</div>
            </div>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4, background: TOKENS.primarySoft,
              color: TOKENS.primaryInk, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
            }}>Family</span>
          </div>
        </Section>
        <Section>
          <Item icon="kids" label="Personalization" sub="Memory · style" target="settings:personalization"/>
          <Item icon="doc"  label="Profile"                                  target="settings:profile"/>
          <Item icon="gear" label="Settings"                                 target="settings:general"/>
        </Section>
        <Section>
          <Item icon="bell"  label="Notifications" target="settings:notifications"/>
          <Item icon="alert" label="Help & support" target="settings:help"/>
        </Section>
        <Section last>
          <Item icon="skip" label="Log out" danger target="settings:logout"/>
        </Section>
      </div>
    </>
  );
}

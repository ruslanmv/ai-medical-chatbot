'use client';

import { Icon } from '../Icon';

export type Role = 'Researcher' | 'Clinical Reviewer';

interface Props {
  role: Role;
  setRole: (r: Role) => void;
}

export function Topbar({ role, setRole }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 28px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{
        flex: 1, maxWidth: 720, position: 'relative',
        background: 'var(--slate-50)', borderRadius: 10,
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        height: 40,
      }}>
        <Icon name="Search" size={16} stroke="var(--ink-3)"/>
        <input
          placeholder="Search PubMed, trials, targets, compounds…"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            outline: 'none', padding: '0 12px',
            fontSize: 13.5, color: 'var(--ink)',
          }}
        />
        <kbd style={{
          fontSize: 11, padding: '2px 6px',
          border: '1px solid var(--border-strong)',
          borderRadius: 4, color: 'var(--ink-3)', background: '#fff',
        }}>⌘K</kbd>
      </div>
      <div style={{ flex: 1 }}/>
      <RoleSwitcher role={role} setRole={setRole}/>
      <button
        title="Notifications"
        style={{
          width: 40, height: 40, borderRadius: 10, position: 'relative',
          border: '1px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--ink-2)',
        }}
      >
        <Icon name="Bell" size={18}/>
        <span style={{
          position: 'absolute', top: 6, right: 7,
          width: 16, height: 16, borderRadius: 999, background: 'var(--red)',
          color: '#fff', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
        }}>6</span>
      </button>
    </div>
  );
}

function RoleSwitcher({ role, setRole }: Props) {
  const roles: Role[] = ['Researcher', 'Clinical Reviewer'];
  return (
    <div style={{
      display: 'flex', padding: 3, background: 'var(--slate-100)',
      borderRadius: 999, border: '1px solid var(--border)',
    }}>
      {roles.map((r) => (
        <button key={r} onClick={() => setRole(r)} style={{
          padding: '6px 14px', borderRadius: 999, border: 'none',
          background: role === r ? '#fff' : 'transparent',
          color: role === r ? 'var(--brand-600)' : 'var(--ink-3)',
          fontSize: 12.5, fontWeight: role === r ? 600 : 500,
          cursor: 'pointer',
          boxShadow: role === r ? '0 1px 2px rgba(15,23,42,.08)' : 'none',
        }}>{r}</button>
      ))}
    </div>
  );
}

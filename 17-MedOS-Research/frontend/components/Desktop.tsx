'use client';

import { useState } from 'react';
import { SCREEN_LABELS, type NavId } from '../lib/nav';
import { Sidebar } from './shell/Sidebar';
import { Topbar, type Role } from './shell/Topbar';
import { PlaceholderPage } from './pages/PlaceholderPage';

export function Desktop() {
  const [active, setActive] = useState<NavId>('dash');
  const [role, setRole] = useState<Role>('Researcher');

  return (
    <div
      data-screen-label={`Desktop · ${SCREEN_LABELS[active]}`}
      style={{
        minHeight: '100vh', display: 'flex',
        background: 'var(--bg)', overflow: 'hidden',
      }}
    >
      <Sidebar active={active} onChange={setActive}/>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar role={role} setRole={setRole}/>
        <div style={{ flex: 1, minHeight: 0 }}>
          <PlaceholderPage
            title={SCREEN_LABELS[active].replace(/^\d+ /, '')}
            subtitle="Layout shell active. Page content lands in the next batches."
          />
        </div>
      </main>
    </div>
  );
}

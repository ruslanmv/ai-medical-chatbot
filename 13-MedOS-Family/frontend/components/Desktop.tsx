'use client';

import { useState } from 'react';
import { TOKENS } from '../lib/tokens';
import type { NavId, SettingsSection } from '../lib/nav';
import { Sidebar } from './shell/Sidebar';
import { Topbar } from './shell/Topbar';
import { PlaceholderPage } from './pages/PlaceholderPage';

export function Desktop() {
  const [active, setActive] = useState<NavId>('home');
  const [, setSettingsSection] = useState<SettingsSection>('general');
  const [userOpen, setUserOpen] = useState(false);

  const handleNav = (target: NavId | `settings:${SettingsSection}`) => {
    if (target.startsWith('settings:')) {
      setActive('settings');
      setSettingsSection(target.split(':')[1] as SettingsSection);
    } else {
      setActive(target as NavId);
    }
    setUserOpen(false);
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: TOKENS.bg, color: TOKENS.ink,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <Sidebar
        active={active}
        onNav={handleNav}
        userOpen={userOpen}
        onUserToggle={setUserOpen}
      />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar/>
        <div
          style={{ padding: '28px 32px', flex: 1, overflow: 'auto' }}
          data-screen-label={`Desktop · ${active}`}
        >
          {/* Pages are wired up across batches 2–5. Batch 1 ships the shell. */}
          <PlaceholderPage
            eyebrow="MedOS Family"
            title={`${active.charAt(0).toUpperCase()}${active.slice(1)}`}
            subtitle="Layout shell active. Page content lands in the next batches."
          />
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TOKENS } from '../lib/tokens';
import type { NavId, SettingsSection } from '../lib/nav';
import { TODAY_DOSES, type DoseStatus } from '../lib/data';
import { useWidgets } from '../lib/useWidgets';
import { Sidebar } from './shell/Sidebar';
import { Topbar } from './shell/Topbar';
import { HomePage } from './pages/HomePage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { Toast } from './Toast';

export function Desktop() {
  const [active, setActive] = useState<NavId>('home');
  const [, setSettingsSection] = useState<SettingsSection>('general');
  const [userOpen, setUserOpen] = useState(false);

  const [doses, setDoses] = useState(TODAY_DOSES);
  const [toast, setToast] = useState<string | null>(null);
  const [widgets, setWidgets] = useWidgets();
  const [, setCustomizing] = useState(false);

  const mark = (id: string, status: DoseStatus) => {
    setDoses((prev) => prev.map((x) => x.id === id ? { ...x, status } : x));
    const labels: Partial<Record<DoseStatus, string>> = {
      taken: 'Marked taken', snoozed: 'Snoozed 30 min', skipped: 'Skipped',
    };
    if (labels[status]) {
      setToast(labels[status]!);
      setTimeout(() => setToast(null), 1800);
    }
  };

  const handleNav = (target: NavId | `settings:${SettingsSection}`) => {
    if (target.startsWith('settings:')) {
      setActive('settings');
      setSettingsSection(target.split(':')[1] as SettingsSection);
    } else {
      setActive(target as NavId);
    }
    setUserOpen(false);
  };

  const renderPage = () => {
    if (active === 'home') {
      return (
        <HomePage
          doses={doses}
          mark={mark}
          widgets={widgets}
          setWidgets={setWidgets}
          onCustomize={() => setCustomizing(true)}
        />
      );
    }
    return (
      <PlaceholderPage
        eyebrow="MedOS Family"
        title={active.charAt(0).toUpperCase() + active.slice(1)}
        subtitle="Page content lands in upcoming batches."
      />
    );
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
          {renderPage()}
        </div>
      </main>
      {toast && <Toast message={toast}/>}
    </div>
  );
}

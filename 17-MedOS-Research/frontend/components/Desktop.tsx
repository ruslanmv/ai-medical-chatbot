'use client';

import { useState } from 'react';
import { SCREEN_LABELS, type NavId } from '../lib/nav';
import { Sidebar } from './shell/Sidebar';
import { Topbar, type Role } from './shell/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiteraturePage } from './pages/LiteraturePage';
import { DiseasePage } from './pages/DiseasePage';
import { CandidatesPage } from './pages/CandidatesPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export function Desktop() {
  const [active, setActive] = useState<NavId>('dash');
  const [role, setRole] = useState<Role>('Researcher');

  const renderPage = () => {
    switch (active) {
      case 'dash':    return <DashboardPage/>;
      case 'lit':     return <LiteraturePage/>;
      case 'disease': return <DiseasePage/>;
      case 'cand':    return <CandidatesPage/>;
      default:
        return (
          <PlaceholderPage
            title={SCREEN_LABELS[active].replace(/^\d+ /, '')}
            subtitle="Layout shell active. Page content lands in the next batches."
          />
        );
    }
  };

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
        {renderPage()}
      </main>
    </div>
  );
}

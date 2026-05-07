'use client';

import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{
      width: 380, height: 800, borderRadius: 36, overflow: 'hidden',
      background: '#fff',
      border: '8px solid #2a3140',
      boxShadow: '0 30px 60px rgba(15,23,42,.18)',
      display: 'flex', flexDirection: 'column',
    }}>
      <StatusBar/>
      {children}
    </div>
  );
}

export function StatusBar() {
  return (
    <div style={{
      height: 28, padding: '0 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
      background: '#fff', position: 'relative', flexShrink: 0,
    }}>
      <span>9:30</span>
      <div style={{
        position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
        width: 18, height: 18, background: '#000', borderRadius: '50%',
      }}/>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="14" height="10" viewBox="0 0 16 12" fill="currentColor">
          <path d="M0 9h2v3H0zM3 7h2v5H3zM6 5h2v7H6zM9 3h2v9H9zM12 0h2v12h-2z"/>
        </svg>
        <svg width="14" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/>
          <circle cx="12" cy="19" r="1" fill="currentColor"/>
        </svg>
        <svg width="20" height="11" viewBox="0 0 22 11" fill="none">
          <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor"/>
          <rect x="2"   y="2"   width="15" height="7"  rx="1" fill="currentColor"/>
          <rect x="19"  y="3.5" width="2"  height="4"  rx="0.5" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

export function Gesture() {
  return (
    <div style={{
      height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', flexShrink: 0,
    }}>
      <div style={{ width: 110, height: 4, borderRadius: 2, background: 'var(--ink)' }}/>
    </div>
  );
}

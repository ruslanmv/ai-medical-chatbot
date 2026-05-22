'use client';

import { TONES, type ProjectIconKind, type ProjectTone } from '../../lib/data';

interface Props {
  kind: ProjectIconKind;
  tone: ProjectTone;
}

export function ProjectIcon({ kind, tone }: Props) {
  const t = TONES[tone];
  const stroke = t.stroke;

  let inner: React.ReactNode = null;
  if (kind === 'ear') {
    inner = (
      <g stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19a3 3 0 0 1-3-3c0-1.5.5-2.5 1-3.5.6-1.2 1.2-2 1.2-4.5a4.8 4.8 0 0 1 9.6 0c0 4-2.7 4.7-4 6.5-1 1.4-1.5 2-1.5 3a1.6 1.6 0 0 1-3.3 0"/>
        <path d="M14 9a2 2 0 0 0-4 0c0 .8.4 1 .8 1.5"/>
      </g>
    );
  } else if (kind === 'cell') {
    inner = (
      <g fill={stroke} opacity="0.85">
        <circle cx="12" cy="12" r="6"/>
        <circle cx="9"  cy="11" r="1.4" fill="#fff"/>
        <circle cx="14" cy="11" r="1.2" fill="#fff"/>
        <circle cx="11" cy="14" r="1"   fill="#fff"/>
      </g>
    );
  } else if (kind === 'liver') {
    inner = (
      <g stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8c0-1.5 1.5-3 4-3 3 0 5 2 8 2s4-1 4 1v6a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z"/>
        <path d="M9 11c0 2 1 4 3 4M14 12c1 0 2 1 2 2"/>
      </g>
    );
  } else if (kind === 'droplet') {
    inner = (
      <g stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4s-5 5-5 9a5 5 0 0 0 10 0c0-4-5-9-5-9z"/>
        <path d="M9 14a3 3 0 0 0 3 3"/>
      </g>
    );
  }

  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24">{inner}</svg>
    </div>
  );
}

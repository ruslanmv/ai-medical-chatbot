'use client';

import { type Project } from '../../lib/data';
import { Icon } from '../Icon';
import { ProjectIcon } from './ProjectIcon';

interface Props {
  p: Project;
  active: boolean;
  onClick: () => void;
}

export function ProjectCard({ p, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left',
        background: 'var(--surface)', cursor: 'pointer',
        border: active ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        borderRadius: 16, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: active
          ? '0 0 0 4px rgba(37,99,235,.08), var(--shadow-sm)'
          : 'var(--shadow-sm)',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    >
      <ProjectIcon kind={p.icon} tone={p.tone}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{p.title}</div>
        <div style={{
          fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{p.sub}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6 }}>Updated {p.updated}</div>
      </div>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? '#22c55e' : '#cbd5e1',
        flexShrink: 0,
      }}/>
    </button>
  );
}

export function AddProjectCard() {
  return (
    <button style={{
      width: 180, flexShrink: 0,
      background: 'transparent', cursor: 'pointer',
      border: '1.5px dashed var(--border-strong)',
      borderRadius: 16, padding: 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, color: 'var(--ink-3)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13.5, fontWeight: 600, color: 'var(--brand-600)',
      }}>
        <Icon name="Plus" size={16}/> Add Project
      </div>
      <div style={{ fontSize: 11.5, textAlign: 'center', lineHeight: 1.4 }}>
        Start a new<br/>research workspace
      </div>
    </button>
  );
}

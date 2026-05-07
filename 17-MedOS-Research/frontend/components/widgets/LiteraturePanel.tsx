'use client';

import {
  RECENT_PAPERS, SOURCES,
} from '../../lib/data';
import { Icon } from '../Icon';
import { Link, Panel, Tag } from '../Primitives';

export function LiteraturePanel() {
  return (
    <Panel
      title="Literature Overview"
      info={<Icon name="HelpCircle" size={13} stroke="var(--ink-4)" style={{ verticalAlign: 'middle' }}/>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <SectionLabel>Source coverage</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SOURCES.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SourceMark mark={s.mark}/>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>{s.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.count}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Recent papers</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {RECENT_PAPERS.map((p) => (
              <div key={p.title}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35 }}>{p.title}</div>
                <div style={{
                  fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3,
                  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                }}>
                  <span>{p.meta}</span>
                  {p.tags.map(([label, tone]) => <Tag key={label} tone={tone}>{label}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 18, paddingTop: 4,
        borderTop: '1px solid var(--border)', marginTop: 4,
      }}>
        <Link>View full literature workspace</Link>
        <Link>Go to literature workspace</Link>
      </div>
    </Panel>
  );
}

export function SourceMark({ mark }: { mark: string }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6,
      background: 'var(--slate-100)', color: 'var(--ink-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9.5, fontWeight: 700,
    }}>{mark}</div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--ink-3)', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10,
    }}>{children}</div>
  );
}

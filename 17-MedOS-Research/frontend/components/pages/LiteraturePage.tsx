'use client';

import { useState } from 'react';
import { EVIDENCE_THEMES, LIT_PAPERS, SOURCES } from '../../lib/data';
import { Icon } from '../Icon';
import { Link, PageHeader, Panel, PrimaryBtn, ResearchOnlyFooter, ScreenWrap, SecondaryBtn, Tag } from '../Primitives';
import { SourceMark } from '../widgets/LiteraturePanel';

const FILTERS = ['All', 'PubMed', 'Trials', 'Targets', 'Compounds'] as const;

export function LiteraturePage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');

  return (
    <ScreenWrap>
      <PageHeader
        title="Literature Workspace"
        subtitle="Search, organize, and synthesize biomedical evidence across sources."
        actions={<>
          <SecondaryBtn icon="Filter">Filters</SecondaryBtn>
          <PrimaryBtn icon="Plus">Build evidence brief</PrimaryBtn>
        </>}
      />

      {/* Search bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 16, marginBottom: 16, boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '0 14px', height: 44,
        }}>
          <Icon name="Search" size={18} stroke="var(--ink-3)"/>
          <input
            placeholder="Search PubMed, trials, targets, compounds…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 14, color: 'var(--ink)',
            }}
          />
          <kbd style={{
            fontSize: 11, padding: '2px 6px',
            border: '1px solid var(--border-strong)', borderRadius: 4,
            color: 'var(--ink-3)', background: '#fff',
          }}>⌘K</kbd>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 14px', borderRadius: 999,
                border: '1px solid ' + (on ? 'var(--brand)' : 'var(--border)'),
                background: on ? 'var(--brand)' : '#fff',
                color: on ? '#fff' : 'var(--ink-2)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>{f}</button>
            );
          })}
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', alignSelf: 'center' }}>
            2,842 results · sorted by relevance
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Results list */}
        <Panel title="Results">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {LIT_PAPERS.map((p, i) => (
              <div key={p.t} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'var(--slate-100)', color: 'var(--ink-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name="FileText" size={16}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35 }}>{p.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                    {p.a} · <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{p.src}</span> · {p.y} · {p.cit} citations
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                    {p.tags.map(([l, t]) => <Tag key={l} tone={t}>{l}</Tag>)}
                  </div>
                </div>
                <button style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: '1px solid var(--border)', background: '#fff', color: 'var(--ink-3)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}><Icon name="Bookmark" size={14}/></button>
              </div>
            ))}
          </div>
        </Panel>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Source coverage">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SOURCES.map((s) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SourceMark mark={s.mark}/>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>{s.name}</div>
                  <div style={{
                    flex: 1, height: 6, background: 'var(--slate-100)',
                    borderRadius: 999, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(100, (s.bar / 1500) * 100)}%`,
                      height: '100%', background: 'var(--brand)',
                    }}/>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, width: 50, textAlign: 'right' }}>{s.count}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Evidence themes" action={<Link>View all</Link>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVIDENCE_THEMES.map(([n, c, color]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }}/>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>{n}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c} papers</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

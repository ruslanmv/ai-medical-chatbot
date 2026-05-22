'use client';

import { useState } from 'react';
import { Icon } from '../Icon';
import { Gesture, PhoneFrame } from './PhoneFrame';
import { MNavBar, MTopBar, Tag2, type MTab } from './MobileBits';
import type { TagTone } from '../../lib/data';

const FILTERS = ['All', 'PubMed', 'Trials', 'Targets', 'Compounds'] as const;

const M_PAPERS: Array<{ t: string; a: string; tags: Array<[string, TagTone]> }> = [
  { t: 'Thalamocortical dysrhythmia in tinnitus',          a: 'Jastreboff, P. J. et al., 2014',     tags: [['PubMed','clinical'], ['Mechanistic','mech'],  ['Peer-reviewed','peer']] },
  { t: 'NMDA receptor hypofunction and central gain',      a: 'Schaette, R., McAlpine, D., 2011',   tags: [['PubMed','clinical'], ['Preclinical','animal'],['Peer-reviewed','peer']] },
  { t: 'Deep brain stimulation for tinnitus',              a: 'De Ridder, D. et al., 2021',         tags: [['PubMed','clinical'], ['Clinical','clinical'], ['Peer-reviewed','peer']] },
  { t: 'Ketamine modulates tinnitus distress',             a: 'Kell, C. A. et al., 2024',           tags: [['Trials.gov','clinical'], ['Clinical trial','clinical'], ['Peer-reviewed','peer']] },
  { t: 'GABAergic modulation reduces tinnitus severity',   a: 'Sullivan, R. et al., 2020',          tags: [['bioRxiv','preprint'], ['Preprint','preprint']] },
];

const THEMES: Array<[string, string]> = [
  ['Central gain',         '12 papers'],
  ['GABAergic modulation', '9 papers'],
  ['NMDA hypofunction',    '8 papers'],
];

export function MobileLiterature({ onNav }: { onNav: (t: MTab) => void }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');

  return (
    <PhoneFrame>
      <MTopBar title="Literature Workspace" right={
        <button style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--ink-2)',
        }}><Icon name="Filter" size={20}/></button>
      }/>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
        {/* Search */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
          padding: '0 14px', height: 44,
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        }}>
          <Icon name="Search" size={16} stroke="var(--ink-3)"/>
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>
            Search PubMed, trials, targets, compounds…
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 14px', borderRadius: 999,
                border: '1px solid ' + (on ? 'var(--brand)' : 'var(--border)'),
                background: on ? 'var(--brand)' : '#fff',
                color: on ? '#fff' : 'var(--ink-2)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{f}</button>
            );
          })}
        </div>

        {/* Results header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Top Results</h3>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            fontSize: 12, color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none',
          }}>View all</a>
        </div>

        {/* Paper list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {M_PAPERS.map((p) => (
            <div key={p.t} style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
              padding: 12, display: 'flex', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--slate-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-3)', flexShrink: 0,
              }}><Icon name="FileText" size={14}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{p.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{p.a}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {p.tags.map(([l, t], i) => <Tag2 key={i} tone={t}>{l}</Tag2>)}
                </div>
              </div>
              <Icon name="Bookmark" size={16} stroke="var(--ink-4)"/>
            </div>
          ))}
        </div>

        {/* Themes */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Evidence Themes</h3>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            fontSize: 12, color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none',
          }}>View all</a>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {THEMES.map(([n, c]) => (
            <div key={n} style={{
              flex: '1 0 auto', minWidth: 110,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 12,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{n}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{c}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #eff6ff, #fff)',
          border: '1px solid #bfdbfe', borderRadius: 14, padding: 14,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--brand-50)', color: 'var(--brand-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="Sparkles" size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-600)' }}>
              Build evidence brief
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
              Synthesize and summarize key findings
            </div>
          </div>
          <Icon name="ChevronRight" size={18} stroke="var(--brand-600)"/>
        </button>
      </div>

      <MNavBar active="lit" onChange={onNav}/>
      <Gesture/>
    </PhoneFrame>
  );
}

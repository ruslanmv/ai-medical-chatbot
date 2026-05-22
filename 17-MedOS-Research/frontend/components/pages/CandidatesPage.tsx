'use client';

import { Fragment, useState } from 'react';
import { CAND_FULL } from '../../lib/data';
import { Icon } from '../Icon';
import {
  Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn, Stat, Tag, VerdictBadge,
} from '../Primitives';

export function CandidatesPage() {
  const [sel, setSel] = useState(0);
  const c = CAND_FULL[sel]!;

  return (
    <ScreenWrap>
      <PageHeader
        title="Candidate Medicines"
        subtitle="Compare candidate compounds, drugs, biologics, or interventions for research purposes."
        actions={<>
          <SecondaryBtn icon="Filter">Filters</SecondaryBtn>
          <SecondaryBtn icon="ArrowUpRight">Export</SecondaryBtn>
          <PrimaryBtn icon="Plus">Add candidate</PrimaryBtn>
        </>}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
        padding: '12px 14px', fontSize: 13, color: '#854d0e', marginBottom: 16,
      }}>
        <Icon name="Alert" size={18} stroke="#d97706"/>
        <div>
          <strong style={{ color: '#92400e' }}>Human use warning:</strong>{' '}
          research comparison only — not a treatment recommendation. Clinical use requires regulatory
          approval and physician judgment.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Panel title="Comparison table">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 110px 1fr 110px 70px',
            gap: '0 12px', fontSize: 12.5,
          }}>
            {['Candidate', 'Mechanism', 'Stage', 'Known risks', 'Trial', 'Score'].map((h) => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
                textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8,
              }}>{h}</div>
            ))}
            {CAND_FULL.map((row, i) => (
              <Fragment key={row.name}>
                <div onClick={() => setSel(i)} style={{
                  borderTop: '1px solid var(--border)', padding: '11px 0',
                  fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                  background: sel === i ? 'var(--brand-50)' : 'transparent',
                  borderRadius: 6, paddingLeft: sel === i ? 6 : 0,
                }}>{row.name}</div>
                <Cell>{row.mech}</Cell>
                <Cell><Tag tone={row.stage[1]}>{row.stage[0]}</Tag></Cell>
                <Cell>{row.risk}</Cell>
                <Cell>{row.trial}</Cell>
                <div style={{
                  borderTop: '1px solid var(--border)', padding: '11px 0',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    width: 36, height: 5,
                    background: 'var(--slate-100)', borderRadius: 999, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${row.score}%`, height: '100%',
                      background: row.score > 70 ? '#10b981' : row.score > 50 ? '#f59e0b' : '#ef4444',
                    }}/>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{row.score}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </Panel>

        <Panel title="Selected candidate" action={<Link>Open profile</Link>}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{c.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{c.mech}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Tag tone={c.stage[1]}>{c.stage[0]}</Tag>
              <VerdictBadge v={c.ev}/>
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--border)' }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat label="Evidence score" value={`${c.score}/100`} sub="Composite signal"/>
            <Stat label="Papers"         value={String(c.papers)} sub="Indexed evidence"/>
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
            }}>Known risks</div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10,
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            }}>
              <Icon name="Alert" size={14} stroke="#dc2626" style={{ flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.45 }}>{c.risk}</div>
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
            }}>Pipeline status</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              Trial status: <strong>{c.trial}</strong>
            </div>
          </div>
        </Panel>
      </div>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '11px 0', color: 'var(--ink-2)',
    }}>{children}</div>
  );
}

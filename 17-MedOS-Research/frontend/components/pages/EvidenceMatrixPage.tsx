'use client';

import { Fragment } from 'react';
import { EVID_FULL } from '../../lib/data';
import {
  Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn, VerdictBadge,
} from '../Primitives';

const SUMMARY = [
  { label: 'For',          v: 4,  tone: '#10b981', bg: '#ecfdf5' },
  { label: 'Mixed',        v: 12, tone: '#f59e0b', bg: '#fffbeb' },
  { label: 'Against',      v: 7,  tone: '#ef4444', bg: '#fef2f2' },
  { label: 'Insufficient', v: 6,  tone: '#94a3b8', bg: '#f1f5f9' },
];

export function EvidenceMatrixPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Evidence Matrix"
        subtitle="All claims with supporting and contradicting evidence, traceable to source papers."
        actions={<>
          <SecondaryBtn icon="Filter">Filter by verdict</SecondaryBtn>
          <PrimaryBtn icon="Plus">Add claim</PrimaryBtn>
        </>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {SUMMARY.map((s) => (
          <div key={s.label} style={{
            flex: 1, background: s.bg, border: '1px solid var(--border)',
            borderRadius: 14, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: '#fff',
              color: s.tone, fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{s.v}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>Claims</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Panel title="All claims" action={<Link>Export evidence</Link>}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 130px 1fr 100px',
          gap: '0 14px', fontSize: 12.5,
        }}>
          {['Claim', 'Net evidence', 'Distribution', 'Sources'].map((h) => (
            <div key={h} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8,
            }}>{h}</div>
          ))}
          {EVID_FULL.map((e) => (
            <Fragment key={e.c}>
              <Cell>{e.c}</Cell>
              <Cell><VerdictBadge v={e.v}/></Cell>
              <Cell><DistroBar f={e.for} a={e.against} m={e.mixed} total={e.total}/></Cell>
              <Cell muted small>{e.total} papers</Cell>
            </Fragment>
          ))}
        </div>
      </Panel>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

function Cell({ children, muted, small }: { children: React.ReactNode; muted?: boolean; small?: boolean }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '12px 0',
      color: muted ? 'var(--ink-3)' : 'var(--ink-2)',
      fontSize: small ? 12 : undefined,
    }}>{children}</div>
  );
}

function DistroBar({ f, a, m, total }: { f: number; a: number; m: number; total: number }) {
  const fp = (f / total) * 100, ap = (a / total) * 100, mp = (m / total) * 100;
  return (
    <div>
      <div style={{
        height: 8, borderRadius: 999, overflow: 'hidden',
        background: 'var(--slate-100)', display: 'flex',
      }}>
        <div style={{ width: fp + '%', background: '#10b981' }} title={`For: ${f}`}/>
        <div style={{ width: mp + '%', background: '#f59e0b' }} title={`Mixed: ${m}`}/>
        <div style={{ width: ap + '%', background: '#ef4444' }} title={`Against: ${a}`}/>
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
        <span><span style={{ color: '#059669', fontWeight: 600 }}>{f}</span> for</span>
        <span><span style={{ color: '#b45309', fontWeight: 600 }}>{m}</span> mixed</span>
        <span><span style={{ color: '#b91c1c', fontWeight: 600 }}>{a}</span> against</span>
      </div>
    </div>
  );
}

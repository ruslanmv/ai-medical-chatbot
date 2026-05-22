'use client';

import { Fragment } from 'react';
import { EXPERIMENTS, type ExpStatus, type ExpType } from '../../lib/data';
import {
  KpiCard, Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn, Tag,
} from '../Primitives';
import type { TagTone } from '../../lib/data';

const TYPE_TONE: Record<ExpType, TagTone> = {
  Animal:     'animal',
  'In vitro': 'silico',
  Data:       'review',
  'Clinical*':'clinical',
};

const STATUS_TONE: Record<ExpStatus, { bg: string; fg: string; dot: string }> = {
  Planned:       { bg: '#eef2ff', fg: '#4338ca', dot: '#6366f1' },
  'In progress': { bg: '#dbeafe', fg: '#1d4ed8', dot: '#2563eb' },
  Complete:      { bg: '#ecfdf5', fg: '#065f46', dot: '#10b981' },
  'On hold':     { bg: '#fff7ed', fg: '#c2410c', dot: '#f59e0b' },
};

export function ExperimentPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Experiment Registry"
        subtitle="Plan, register, and track experiments across in-vitro, animal, and data-only studies."
        actions={<>
          <SecondaryBtn icon="ArrowUpRight">Export</SecondaryBtn>
          <PrimaryBtn icon="Plus">Register experiment</PrimaryBtn>
        </>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <KpiCard k={{ label: 'Registered experiments', value: '47', sub: '6 this quarter',     subTone: 'green',  icon: 'Flask',       iconBg: '#f5f3ff', iconColor: '#7c3aed' }}/>
        <KpiCard k={{ label: 'In progress',            value: '12', sub: '3 awaiting samples', subTone: 'muted',  icon: 'Activity',    iconBg: '#dbeafe', iconColor: '#2563eb' }}/>
        <KpiCard k={{ label: 'Complete',               value: '28', sub: '24 with full data',  subTone: 'green',  icon: 'CheckCircle', iconBg: '#ecfdf5', iconColor: '#0d9488' }}/>
        <KpiCard k={{ label: 'Pending IRB / approvals',value: '3',  sub: 'Requires review',    subTone: 'orange', icon: 'Shield',      iconBg: '#fef3c7', iconColor: '#d97706' }}/>
      </div>

      <Panel title="All experiments" action={<Link>Filter / sort</Link>}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 110px 130px 120px 120px',
          gap: '0 14px', fontSize: 12.5,
        }}>
          {['ID', 'Experiment', 'Type', 'Status', 'PI', 'Start date'].map((h) => (
            <div key={h} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8,
            }}>{h}</div>
          ))}
          {EXPERIMENTS.map((e) => {
            const tone = STATUS_TONE[e.status];
            return (
              <Fragment key={e.id}>
                <div style={{
                  borderTop: '1px solid var(--border)', padding: '12px 0',
                  fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 11.5,
                  color: 'var(--brand-600)', fontWeight: 600,
                }}>{e.id}</div>
                <div style={{
                  borderTop: '1px solid var(--border)', padding: '12px 0',
                  color: 'var(--ink)', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {e.name}
                  {e.flag && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: '#fef3c7', color: '#b45309',
                    }}>{e.flag}</span>
                  )}
                </div>
                <Cell><Tag tone={TYPE_TONE[e.type]}>{e.type}</Tag></Cell>
                <Cell>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                    background: tone.bg, color: tone.fg,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.dot }}/>
                    {e.status}
                  </span>
                </Cell>
                <Cell muted={false}>{e.pi}</Cell>
                <Cell muted>{e.start}</Cell>
              </Fragment>
            );
          })}
        </div>
      </Panel>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '12px 0',
      color: muted ? 'var(--ink-3)' : 'var(--ink-2)',
    }}>{children}</div>
  );
}

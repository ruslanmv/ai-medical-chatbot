'use client';

import { Icon, type IconName } from '../Icon';
import { Gesture, PhoneFrame } from './PhoneFrame';
import { MNavBar, MTopBar, Tag2, type MTab } from './MobileBits';
import type { TagTone } from '../../lib/data';

interface MCand {
  name: string; mech: string;
  stage: [string, TagTone];
  risk: string; trial: string;
  signal: number[];
  notes: string;
}

const M_CANDS: MCand[] = [
  { name: 'Memantine',           mech: 'NMDA antagonist',  stage: ['In vitro',     'clinical'], risk: 'Dizziness, confusion', trial: 'Phase 1',     signal: [1,1,1,0,0],         notes: 'Hippocampal safety flag' },
  { name: 'Gaboxadol',           mech: 'GABA_A agonist',   stage: ['Preclinical',  'animal'  ], risk: 'Sedation',             trial: 'Preclinical', signal: [1,1,1,0,0],         notes: 'CNS depressant effects' },
  { name: 'ACPC2 inhibitor',     mech: 'KCC2 enhancer',    stage: ['In silico',    'silico'  ], risk: 'Unknown',              trial: '—',           signal: [0.5,0.5,0.5,0,0],   notes: 'Selectivity advantage'   },
  { name: 'Ketamine (low dose)', mech: 'NMDA antagonist',  stage: ['Clinical',     'clinical'], risk: 'Dissociation, BP↑',    trial: 'Phase 2',     signal: [1,1,0.4,0.4,0],     notes: 'Existing human data'     },
];

function SignalDots({ s }: { s: number[] }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {s.map((v, i) => {
        const c = v >= 1   ? '#10b981'
                : v >= 0.5 ? '#f59e0b'
                : v > 0    ? '#3b82f6'
                : '#cbd5e1';
        return <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }}/>;
      })}
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 10px',
      borderBottom: '1px solid var(--border)',
      borderRight: '1px solid var(--slate-100)',
      background: 'var(--slate-50)',
      fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: 0.4,
    }}>{children}</div>
  );
}

function Cell({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      padding: '12px 10px',
      borderBottom: last ? 'none' : '1px solid var(--slate-100)',
      borderRight: '1px solid var(--slate-100)',
    }}>{children}</div>
  );
}

interface ActionCardProps {
  icon: IconName; iconBg: string; iconFg: string;
  title: string; sub: string;
}

function ActionCard({ icon, iconBg, iconFg, title, sub }: ActionCardProps) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: 12, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: iconBg, color: iconFg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><Icon name={icon} size={16}/></div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

export function MobileCandidates({ onNav }: { onNav: (t: MTab) => void }) {
  return (
    <PhoneFrame>
      <MTopBar title="Candidate Medicine Comparison" left="back" right={
        <button style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--ink-2)',
        }}><Icon name="MoreVertical" size={20}/></button>
      }/>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
        {/* Warning */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
          padding: 12, marginBottom: 14,
        }}>
          <Icon name="Alert" size={18} stroke="#d97706" style={{ flexShrink: 0, marginTop: 1 }}/>
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.4 }}>
            <strong>Research comparison only —</strong><br/>
            not a treatment recommendation.
          </div>
        </div>

        {/* Comparison table — horizontally scrollable */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 14,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '110px repeat(4, 110px)',
              minWidth: 'fit-content',
            }}>
              <HeaderCell>Candidate</HeaderCell>
              {M_CANDS.map((c) => (
                <Cell key={c.name}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{c.name}</div>
                </Cell>
              ))}
              <HeaderCell>Mechanism</HeaderCell>
              {M_CANDS.map((c) => (
                <Cell key={c.name}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.mech}</div>
                </Cell>
              ))}
              <HeaderCell>Evidence stage</HeaderCell>
              {M_CANDS.map((c) => <Cell key={c.name}><Tag2 tone={c.stage[1]}>{c.stage[0]}</Tag2></Cell>)}
              <HeaderCell>Known risks</HeaderCell>
              {M_CANDS.map((c) => (
                <Cell key={c.name}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.risk}</div>
                </Cell>
              ))}
              <HeaderCell>Trial status</HeaderCell>
              {M_CANDS.map((c) => (
                <Cell key={c.name}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.trial}</div>
                </Cell>
              ))}
              <HeaderCell>Overall signal</HeaderCell>
              {M_CANDS.map((c) => <Cell key={c.name}><SignalDots s={c.signal}/></Cell>)}
              <HeaderCell>Notes</HeaderCell>
              {M_CANDS.map((c, i) => (
                <Cell key={c.name} last={i === M_CANDS.length - 1}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.35 }}>{c.notes}</div>
                </Cell>
              ))}
            </div>
          </div>
        </div>

        {/* Action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <ActionCard icon="Grid"   iconBg="#f5f3ff" iconFg="#7c3aed" title="Evidence map" sub="View supporting data"/>
          <ActionCard icon="Shield" iconBg="#eff6ff" iconFg="#2563eb" title="Safety review" sub="Check risk signals"/>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Data sources: PubMed, Trials.gov, clinicaltrials.gov, preprints.<br/>
          Assessed on Jun 2, 2025.
        </div>
      </div>

      <MNavBar active="more" onChange={onNav}/>
      <Gesture/>
    </PhoneFrame>
  );
}

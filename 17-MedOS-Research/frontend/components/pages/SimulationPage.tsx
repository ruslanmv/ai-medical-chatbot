'use client';

import { RISK_LEVELS, SIMS } from '../../lib/data';
import { Icon } from '../Icon';
import {
  Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn,
} from '../Primitives';
import { RiskBadge, SimChart } from '../widgets/SimChart';

const DETAIL_ROWS: Array<[string, string]> = [
  ['Method',          'Whole-brain rate model (TVB) with Wilson–Cowan local dynamics'],
  ['Assumptions',     'Altered inhibitory–excitatory balance; static connectome; homogeneous populations'],
  ['Limitations',     'No individual variability; no plasticity adaptation; coarse temporal resolution'],
  ['Reproducibility', 'Code, parameters and data will be published on completion (DOI pending)'],
];

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Running:  { bg: '#dbeafe',         fg: '#1d4ed8' },
  Complete: { bg: '#d1fae5',         fg: '#065f46' },
  Planned:  { bg: 'var(--slate-100)',fg: '#475569' },
  Draft:    { bg: 'var(--slate-100)',fg: '#475569' },
};

export function SimulationPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Simulation Lab"
        subtitle="Plan, run, and reproduce in-silico simulations across mechanistic models."
        actions={<>
          <SecondaryBtn icon="Filter">Filter</SecondaryBtn>
          <PrimaryBtn icon="Plus">New simulation</PrimaryBtn>
        </>}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16,
      }}>
        <Panel title="Simulations" action={<Link>View all</Link>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {SIMS.map((s, i) => {
              const sc = STATUS_COLORS[s.status] || STATUS_COLORS.Planned!;
              return (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#eff6ff', color: '#2563eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name="Monitor" size={18}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      {s.method} · {s.author} · {s.updated}
                    </div>
                  </div>
                  <RiskBadge tone={s.tone} code={s.risk}/>
                  <div style={{
                    fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                    background: sc.bg, color: sc.fg, minWidth: 70, textAlign: 'center',
                  }}>{s.status}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Risk class scale">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RISK_LEVELS.map((r) => (
              <div key={r.code} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: r.blocked ? 0.6 : 1,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: r.tone + '22', color: r.tone,
                  fontWeight: 700, fontSize: 11.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{r.code}</div>
                <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>{r.name}</div>
                {r.blocked && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: '#fef2f2', color: '#b91c1c',
                  }}>BLOCKED</span>
                )}
              </div>
            ))}
          </div>
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: 10, fontSize: 12, color: '#7f1d1d', lineHeight: 1.45,
          }}>
            <strong style={{ color: '#991b1b' }}>R5 outputs are blocked</strong> in MedOS Research MVP.
            Patient-facing recommendations require external clinical pathway.
          </div>
        </Panel>
      </div>

      <Panel
        title="Selected simulation detail"
        info="Thalamocortical network — GABAergic modulation"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DETAIL_ROWS.map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                <div style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 12.5 }}>{k}</div>
                <div style={{ color: 'var(--ink-2)', lineHeight: 1.5, fontSize: 12.5 }}>{v}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
            }}>Parameter sweep preview</div>
            <div style={{
              height: 220,
              background: 'linear-gradient(180deg,#f8fafc,#fff)',
              border: '1px solid var(--border)', borderRadius: 10, padding: 14,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            }}>
              <SimChart/>
            </div>
          </div>
        </div>
      </Panel>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

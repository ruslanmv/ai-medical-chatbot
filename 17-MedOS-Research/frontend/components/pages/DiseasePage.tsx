'use client';

import { TARGETS } from '../../lib/data';
import {
  Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn, Stat,
} from '../Primitives';
import { PathwayDiagram } from '../widgets/PathwayDiagram';

export function DiseasePage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Disease / Target Workspace"
        subtitle="Study disease mechanisms, biological targets, and pathway interactions."
        actions={<>
          <SecondaryBtn icon="Filter">Filter targets</SecondaryBtn>
          <PrimaryBtn icon="Plus">New target</PrimaryBtn>
        </>}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16,
      }}>
        <Panel title="Disease overview" info="Tinnitus · ICD-11 MA80">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Stat label="Affected globally"   value="~750M" sub="Adults"/>
            <Stat label="Chronic prevalence"  value="~14%"  sub="Of adult population"/>
            <Stat label="Severe / disabling"  value="~2%"   sub="Quality-of-life impact"/>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 6 }}>
            Tinnitus is the perception of sound without external acoustic stimulus. Current models implicate{' '}
            <strong style={{ color: 'var(--ink)' }}>central gain dysregulation</strong>{' '}
            following peripheral cochlear injury, with downstream maladaptive changes across thalamocortical circuits.
          </div>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
            }}>Working hypothesis</div>
            <div style={{
              background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10,
              padding: 12, fontSize: 12.5, color: '#4c1d95',
            }}>
              Restoring inhibitory–excitatory balance in central auditory pathways may reduce tinnitus severity in
              a subset of patients with central gain phenotype.
            </div>
          </div>
        </Panel>

        <Panel title="Biological targets" action={<Link>View all 24</Link>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TARGETS.map((t) => (
              <div key={t.n} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.tone }}/>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{t.n}</div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{t.m}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>{t.c} candidate compounds</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Pathway map" info="Central gain · GABA / glutamate balance">
        <div style={{
          background: 'linear-gradient(180deg, #f8fafc, #fff)',
          border: '1px solid var(--border)', borderRadius: 12,
          height: 280, position: 'relative', overflow: 'hidden',
        }}>
          <PathwayDiagram/>
        </div>
      </Panel>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

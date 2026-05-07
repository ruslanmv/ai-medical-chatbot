'use client';

import { Icon, type IconName } from '../Icon';
import {
  GateDot, PageHeader, Panel, Pill, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn,
} from '../Primitives';
import { PUB_SECTIONS } from '../../lib/data';

export function PublicationPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Publication Studio"
        subtitle="Prepare a citation-backed manuscript or research brief, with safety and human gates."
        actions={<>
          <SecondaryBtn icon="ArrowUpRight">Preview</SecondaryBtn>
          <PrimaryBtn icon="FileText">Export draft</PrimaryBtn>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <Panel
          title="Manuscript"
          info="Draft v0.3 · Tinnitus mechanisms — central gain candidates"
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PUB_SECTIONS.map((s, i) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--slate-100)', color: 'var(--ink-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}><Icon name="FileText" size={15}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                  {s.sub && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{s.sub}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <GateDot v={s.c}/><GateDot v={s.s}/><GateDot v={s.h}/>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Gate status">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <GateCard label="Citation check" status="6 of 8 passed" tone="orange" icon="CheckCircle"/>
              <GateCard label="Safety review"  status="6 of 8 passed" tone="orange" icon="Shield" sub="R2"/>
              <GateCard label="Human sign-off" status="1 of 6 signed" tone="muted"  icon="Users"/>
            </div>
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
              padding: 12, fontSize: 12.5, color: '#854d0e',
              display: 'flex', gap: 8,
            }}>
              <Icon name="Alert" size={16} stroke="#d97706" style={{ flexShrink: 0, marginTop: 1 }}/>
              <div>
                Export is <strong>blocked</strong> until citation, safety, and human sign-off all pass for every section.
              </div>
            </div>
          </Panel>

          <Panel title="Preview · Abstract">
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 16, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-2)',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                Central gain candidates in chronic tinnitus: a mechanistic synthesis
              </div>
              Chronic tinnitus has been associated with maladaptive central gain following peripheral cochlear injury.
              We synthesize evidence across <strong style={{ color: 'var(--ink)' }}>247 papers</strong> and identify
              candidate mechanisms — including{' '}
              <strong style={{ color: 'var(--ink)' }}>GABAergic disinhibition</strong> and{' '}
              <strong style={{ color: 'var(--ink)' }}>NMDA-mediated hyperactivity</strong>{' '}
              — that may inform future preclinical investigation. Findings are presented for research purposes only and do not constitute treatment recommendations.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Pill bg="#ecfdf5" fg="#047857" dot="#10b981">Citation check passed</Pill>
              <Pill bg="#ecfdf5" fg="#047857" dot="#10b981">Safety check passed</Pill>
              <Pill bg="#fff7ed" fg="#c2410c" dot="#f59e0b">Awaiting sign-off</Pill>
            </div>
          </Panel>
        </div>
      </div>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

interface GateCardProps {
  label: string; status: string; tone: 'green' | 'orange' | 'muted';
  icon: IconName; sub?: string;
}

function GateCard({ label, status, tone, icon, sub }: GateCardProps) {
  const colors = {
    green:  { bg: '#ecfdf5',           fg: '#047857',     bd: '#bbf7d0' },
    orange: { bg: '#fff7ed',           fg: '#c2410c',     bd: '#fed7aa' },
    muted:  { bg: 'var(--slate-50)',   fg: 'var(--ink-3)',bd: 'var(--border)' },
  }[tone];
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.bd}`,
      borderRadius: 12, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={icon} size={16} stroke={colors.fg}/>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</div>
      </div>
      {sub && <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{sub}</div>}
      <div style={{ fontSize: 12, fontWeight: 600, color: colors.fg }}>{status}</div>
    </div>
  );
}

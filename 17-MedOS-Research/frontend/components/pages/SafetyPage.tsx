'use client';

import { SAFETY_QUEUE, type SafetyTone } from '../../lib/data';
import { Icon } from '../Icon';
import {
  KpiCard, Link, PageHeader, Panel, PrimaryBtn,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn,
} from '../Primitives';

const PATTERNS: Array<[string, number]> = [
  ['Cure / definitive efficacy claims',  18],
  ['Specific dosing recommendations',     9],
  ['Patient-facing instructions',         7],
  ['Prescribing language',                4],
  ['Diagnostic claims',                   0],
];

const REVIEWERS: Array<[string, string, number, 'green' | 'orange' | 'muted']> = [
  ['Lara Okafor',         'Lead clinical reviewer', 12, 'green'],
  ['Daniel Kim',          'Reviewer',                6, 'orange'],
  ['External: Dr. Patel', 'Consult reviewer',        2, 'muted'],
];

export function SafetyPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Safety Review"
        subtitle="Detect, block, and rewrite unsafe claims before they leave the system."
        actions={<>
          <SecondaryBtn icon="Filter">Filter</SecondaryBtn>
          <PrimaryBtn icon="ShieldCheck">Run safety scan</PrimaryBtn>
        </>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <KpiCard k={{ label: 'Claims reviewed',       value: '247', sub: 'This project',     subTone: 'muted',  icon: 'Shield',      iconBg: '#dbeafe', iconColor: '#2563eb' }}/>
        <KpiCard k={{ label: 'Blocked',               value: '38',  sub: '15% of total',     subTone: 'orange', icon: 'XCircle',     iconBg: '#fee2e2', iconColor: '#dc2626' }}/>
        <KpiCard k={{ label: 'Approved with rewrite', value: '64',  sub: '26% of total',     subTone: 'green',  icon: 'CheckCircle', iconBg: '#d1fae5', iconColor: '#059669' }}/>
        <KpiCard k={{ label: 'Pending',               value: '4',   sub: 'Awaiting reviewer',subTone: 'orange', icon: 'Clock',       iconBg: '#fef3c7', iconColor: '#d97706' }}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Panel title="Review queue" action={<Link>View all</Link>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {SAFETY_QUEUE.map((q, i) => <ReviewRow key={q.id} q={q} first={i === 0}/>)}
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Forbidden patterns" info="Detected via rules + LLM check">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PATTERNS.map(([n, c]) => (
                <div key={n} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <Icon name="Alert" size={14} stroke="#dc2626"/>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{n}</div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: c > 0 ? '#b91c1c' : 'var(--ink-3)',
                  }}>{c}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Reviewer assignments">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REVIEWERS.map(([n, r, q, tone]) => {
                const colors = tone === 'green'
                  ? { bg: '#ecfdf5', fg: '#047857' }
                  : tone === 'orange'
                    ? { bg: '#fffbeb', fg: '#b45309' }
                    : { bg: '#f1f5f9', fg: '#475569' };
                const initials = n.split(' ').map((s) => s[0]).join('').slice(0, 2);
                return (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ddd6fe, #fbcfe8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#581c87',
                    }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{n}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r}</div>
                    </div>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                      background: colors.bg, color: colors.fg,
                    }}>{q} pending</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

function ReviewRow({ q, first }: { q: typeof SAFETY_QUEUE[number]; first: boolean }) {
  const tones: Record<SafetyTone, { iconBg: string; iconFg: string; pillBg: string; pillFg: string }> = {
    red:    { iconBg: '#fee2e2', iconFg: '#dc2626', pillBg: '#fef2f2', pillFg: '#b91c1c' },
    green:  { iconBg: '#d1fae5', iconFg: '#059669', pillBg: '#ecfdf5', pillFg: '#047857' },
    orange: { iconBg: '#fef3c7', iconFg: '#d97706', pillBg: '#fffbeb', pillFg: '#b45309' },
  };
  const t = tones[q.tone];

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '14px 0',
      borderTop: first ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: t.iconBg, color: t.iconFg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {q.tone === 'red'   && <Icon name="X"     size={16} strokeWidth={3}/>}
        {q.tone === 'green' && <Icon name="Check" size={16} strokeWidth={3}/>}
        {q.tone === 'orange'&& <Icon name="Clock" size={16}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontFamily: 'ui-monospace, "SF Mono", monospace',
            color: 'var(--brand-600)', fontWeight: 600,
          }}>{q.id}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: t.pillBg, color: t.pillFg,
          }}>{q.status}</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{q.who}</span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4,
        }}>{q.claim}</div>
        <div style={{
          fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.45,
        }}>
          <strong style={{ color: 'var(--ink-2)' }}>Reason:</strong> {q.reason}
        </div>
      </div>
    </div>
  );
}

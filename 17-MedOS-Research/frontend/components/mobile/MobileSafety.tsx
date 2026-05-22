'use client';

import { Icon, type IconName } from '../Icon';
import { Gesture, PhoneFrame } from './PhoneFrame';
import { MNavBar, MTopBar, type MTab } from './MobileBits';

const CHECKLIST: Array<[string, string, 'ok' | 'pending']> = [
  ['Abstract',         'Complete',   'ok'      ],
  ['Methods',          'Complete',   'ok'      ],
  ['Results',          'Complete',   'ok'      ],
  ['Discussion',       'Complete',   'ok'      ],
  ['Limitations',      'In progress','pending' ],
  ['Ethics & safety',  'In review',  'pending' ],
  ['References',       'Complete',   'ok'      ],
];

export function MobileSafety({ onNav }: { onNav: (t: MTab) => void }) {
  return (
    <PhoneFrame>
      <MTopBar title="Safety Review & Publication" left="back" right={
        <button style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--ink-2)',
        }}><Icon name="MoreVertical" size={20}/></button>
      }/>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Claim Safety Check</h3>

        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: 12, display: 'flex', gap: 10, marginBottom: 10,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#fee2e2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="X" size={14} strokeWidth={3}/>
          </div>
          <div style={{ flex: 1, fontSize: 12, color: '#7f1d1d', lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Blocked</div>
            <div><strong>Claim:</strong> &ldquo;Compound X cures tinnitus.&rdquo;</div>
            <div style={{ marginTop: 4 }}>
              <strong>Reason:</strong> Disease-definitive claim; insufficient evidence; potential safety risk.
            </div>
          </div>
        </div>

        <div style={{
          background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12,
          padding: 12, display: 'flex', gap: 10, marginBottom: 16,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#d1fae5', color: '#047857',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="Check" size={14} strokeWidth={3}/>
          </div>
          <div style={{ flex: 1, fontSize: 12, color: '#064e3b', lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Safer rewrite</div>
            <div>
              <strong>Safer claim:</strong> &ldquo;Compound X showed improvements in tinnitus severity in
              preclinical models.&rdquo; Supported by current evidence.
            </div>
          </div>
        </div>

        {/* Publication checklist */}
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Publication Checklist</h3>
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
          padding: '4px 14px', marginBottom: 16,
        }}>
          {CHECKLIST.map(([n, st, v], i) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < CHECKLIST.length - 1 ? '1px solid var(--slate-100)' : 'none',
            }}>
              <Icon name="FileText" size={14} stroke="var(--ink-4)"/>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>{n}</div>
              <div style={{
                fontSize: 11.5, fontWeight: 600,
                color: v === 'ok' ? '#059669' : '#d97706',
              }}>{st}</div>
            </div>
          ))}
        </div>

        {/* Gates */}
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Gates</h3>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16,
        }}>
          <Gate icon="CheckCircle" iconFg="#059669" label="Citation check" status="Passed"  tone="green"/>
          <Gate icon="Shield"      iconFg="#d97706" label="Safety review"  sub="R2" status="Review"  tone="orange"/>
          <Gate icon="Users"       iconFg="#64748b" label="Human sign-off" status="Pending" tone="muted"/>
        </div>

        <button style={{
          width: '100%', padding: 14, borderRadius: 14,
          background: 'var(--brand)', color: '#fff', border: 'none',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 6px 14px rgba(37,99,235,.3)',
        }}>
          Open Publication Studio <Icon name="ArrowRight" size={16}/>
        </button>
      </div>

      <MNavBar active="safety" onChange={onNav}/>
      <Gesture/>
    </PhoneFrame>
  );
}

interface GateProps {
  icon: IconName; iconFg: string; label: string; sub?: string; status: string;
  tone: 'green' | 'orange' | 'muted';
}

function Gate({ icon, iconFg, label, sub, status, tone }: GateProps) {
  const colors = {
    green:  { bg: '#ecfdf5',           fg: '#047857' },
    orange: { bg: '#fef3c7',           fg: '#b45309' },
    muted:  { bg: 'var(--slate-100)',  fg: 'var(--ink-3)' },
  }[tone];
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: 10, textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name={icon} size={14} stroke={iconFg}/>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</div>
      </div>
      {sub && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{sub}</div>}
      <div style={{
        display: 'inline-block', fontSize: 11, fontWeight: 700,
        padding: '3px 8px', borderRadius: 999,
        background: colors.bg, color: colors.fg,
      }}>{status}</div>
    </div>
  );
}

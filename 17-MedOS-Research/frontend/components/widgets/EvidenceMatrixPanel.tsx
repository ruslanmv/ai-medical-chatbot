'use client';

import { Fragment } from 'react';
import { CLAIMS, VERDICT_TONES } from '../../lib/data';
import { Link, Panel, VerdictBadge } from '../Primitives';

export function EvidenceMatrixPanel() {
  return (
    <Panel
      title="Evidence Matrix"
      info={<span>(All claims)</span>}
      action={<Link>View full matrix</Link>}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: '12px 16px', alignItems: 'center',
      }}>
        <Header>Claim</Header>
        <Header right>Net evidence</Header>
        {CLAIMS.map((c) => (
          <Fragment key={c.text}>
            <div style={{
              fontSize: 13, color: 'var(--ink-2)',
              borderTop: '1px solid var(--border)', paddingTop: 11,
            }}>{c.text}</div>
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: 11, textAlign: 'right',
            }}><VerdictBadge v={c.verdict}/></div>
          </Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, paddingTop: 8 }}>
        {Object.entries(VERDICT_TONES).map(([k, t]) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, color: 'var(--ink-3)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }}/>{k}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Header({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      color: 'var(--ink-3)', letterSpacing: 0.4,
      textAlign: right ? 'right' : 'left',
    }}>{children}</div>
  );
}

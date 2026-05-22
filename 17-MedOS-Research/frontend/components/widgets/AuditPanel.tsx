'use client';

import { Fragment } from 'react';
import { AUDIT_DASHBOARD } from '../../lib/data';
import { Link, Panel } from '../Primitives';

export function AuditPanel() {
  return (
    <Panel title="Audit Log" action={<Link>View full log</Link>}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.2fr 1.6fr',
        gap: '8px 14px', fontSize: 12.5,
      }}>
        {['Event', 'User', 'Time', 'Details'].map((h) => (
          <div key={h} style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            color: 'var(--ink-3)', letterSpacing: 0.4,
          }}>{h}</div>
        ))}
        {AUDIT_DASHBOARD.map((a, i) => (
          <Fragment key={i}>
            <div style={{
              borderTop: '1px solid var(--border)', padding: '10px 0',
              color: 'var(--brand-600)', fontWeight: 600,
              fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 11.5,
            }}>{a.e}</div>
            <Cell>{a.u}</Cell>
            <Cell muted>{a.t}</Cell>
            <Cell>{a.d}</Cell>
          </Fragment>
        ))}
      </div>
      <Link>Go to audit log</Link>
    </Panel>
  );
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '10px 0',
      color: muted ? 'var(--ink-3)' : 'var(--ink-2)',
    }}>{children}</div>
  );
}

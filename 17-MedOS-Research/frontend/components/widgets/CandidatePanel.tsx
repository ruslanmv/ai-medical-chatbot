'use client';

import { Fragment } from 'react';
import { CANDIDATES } from '../../lib/data';
import { Icon } from '../Icon';
import { Link, Panel, Tag } from '../Primitives';

export function CandidatePanel() {
  return (
    <Panel title="Candidate Medicine Comparison">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
        padding: '10px 12px', fontSize: 12.5, color: '#854d0e',
      }}>
        <Icon name="Alert" size={16} stroke="#d97706"/>
        <div>
          <strong style={{ color: '#92400e' }}>Human use warning:</strong>{' '}
          research comparison only — not a treatment recommendation.
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 100px 1fr 100px',
        columnGap: 12, fontSize: 12.5,
      }}>
        {['Candidate', 'Mechanism', 'Evidence stage', 'Known risks', 'Trial status'].map((h) => (
          <div key={h} style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            color: 'var(--ink-3)', letterSpacing: 0.4, paddingBottom: 8,
          }}>{h}</div>
        ))}
        {CANDIDATES.map((c) => (
          <Fragment key={c.name}>
            <Cell head>{c.name}</Cell>
            <Cell>{c.mech}</Cell>
            <Cell><Tag tone={c.stage[1]}>{c.stage[0]}</Tag></Cell>
            <Cell>{c.risk}</Cell>
            <Cell>{c.trial}</Cell>
          </Fragment>
        ))}
      </div>
      <Link>Go to candidate workspace</Link>
    </Panel>
  );
}

function Cell({ children, head }: { children: React.ReactNode; head?: boolean }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '10px 0',
      color: head ? 'var(--ink)' : 'var(--ink-2)',
      fontWeight: head ? 600 : 400,
    }}>{children}</div>
  );
}

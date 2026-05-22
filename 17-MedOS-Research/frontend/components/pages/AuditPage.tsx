'use client';

import { Fragment } from 'react';
import { AUDIT_FULL } from '../../lib/data';
import {
  Link, PageHeader, Panel,
  ResearchOnlyFooter, ScreenWrap, SecondaryBtn,
} from '../Primitives';

export function AuditPage() {
  return (
    <ScreenWrap>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of every important research action — for traceability and governance."
        actions={<>
          <SecondaryBtn icon="Filter">Filter</SecondaryBtn>
          <SecondaryBtn icon="ArrowUpRight">Export CSV</SecondaryBtn>
        </>}
      />

      <Panel
        title="Events"
        info={`${AUDIT_FULL.length} events · last 30 days`}
        action={<Link>Open governance</Link>}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1.2fr 1.6fr',
          gap: '0 14px', fontSize: 12.5,
        }}>
          {['Event', 'User', 'Time', 'Details'].map((h) => (
            <div key={h} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8,
            }}>{h}</div>
          ))}
          {AUDIT_FULL.map((a, i) => (
            <Fragment key={i}>
              <div style={{
                borderTop: '1px solid var(--border)', padding: '11px 0',
                fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 11.5,
                color: 'var(--brand-600)', fontWeight: 600,
              }}>{a.e}</div>
              <Cell>{a.u}</Cell>
              <Cell muted>{a.t}</Cell>
              <Cell>{a.d}</Cell>
            </Fragment>
          ))}
        </div>
      </Panel>

      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '11px 0',
      color: muted ? 'var(--ink-3)' : 'var(--ink-2)',
    }}>{children}</div>
  );
}

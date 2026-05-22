'use client';

import { Fragment } from 'react';
import { Icon } from '../Icon';
import { GateDot, Link, Panel } from '../Primitives';
import type { GateState } from '../../lib/data';

interface Row { name: string; c: GateState; s: GateState; h: GateState }

const ROWS: Row[] = [
  { name: 'Abstract',                  c: 'ok',      s: 'ok',      h: 'pending' },
  { name: 'Methods',                   c: 'ok',      s: 'ok',      h: 'pending' },
  { name: 'Results summary',           c: 'ok',      s: 'ok',      h: 'pending' },
  { name: 'Discussion',                c: 'ok',      s: 'pending', h: 'na'      },
  { name: 'Limitations',               c: 'pending', s: 'ok',      h: 'na'      },
  { name: 'Ethics & safety statement', c: 'ok',      s: 'pending', h: 'pending' },
  { name: 'References',                c: 'ok',      s: 'ok',      h: 'ok'      },
];

export function PublicationPanel() {
  return (
    <Panel title="Publication Studio" action={<Link>Open editor</Link>}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px',
        gap: '10px 14px', fontSize: 12.5,
      }}>
        <Header>Section</Header>
        <Header center>Citation check</Header>
        <Header center>Safety review</Header>
        <Header center>Human sign-off</Header>
        {ROWS.map((s) => (
          <Fragment key={s.name}>
            <div style={{
              borderTop: '1px solid var(--border)', padding: '8px 0',
              color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="FileText" size={13} stroke="var(--ink-4)"/>{s.name}
            </div>
            <Cell><GateDot v={s.c}/></Cell>
            <Cell><GateDot v={s.s}/></Cell>
            <Cell><GateDot v={s.h}/></Cell>
          </Fragment>
        ))}
      </div>
      <Link>Go to publication studio</Link>
    </Panel>
  );
}

function Header({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      color: 'var(--ink-3)', letterSpacing: 0.4,
      textAlign: center ? 'center' : 'left',
    }}>{children}</div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '8px 0', textAlign: 'center',
    }}>{children}</div>
  );
}

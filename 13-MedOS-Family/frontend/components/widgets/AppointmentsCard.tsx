'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';
import { Icon } from '../Icon';
import { btnGhost } from '../../lib/styles';
import { APPOINTMENTS } from '../../lib/data';

export function AppointmentsCard() {
  return (
    <Card title="Appointments">
      {APPOINTMENTS.map((a, i) => (
        <div key={i} style={{
          padding: '11px 0',
          borderBottom: i < APPOINTMENTS.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
        }}>
          <div style={{ fontSize: 12, color: TOKENS.ink3 }}>{a.when}</div>
          <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600, marginTop: 2 }}>{a.kind}</div>
          <div style={{ fontSize: 11.5, color: TOKENS.ink2, marginTop: 2 }}>{a.who} · {a.child}</div>
        </div>
      ))}
      <button style={{ ...btnGhost, marginTop: 12, width: '100%', justifyContent: 'center' }}>
        <Icon name="plus" size={13}/> Add appointment
      </button>
    </Card>
  );
}

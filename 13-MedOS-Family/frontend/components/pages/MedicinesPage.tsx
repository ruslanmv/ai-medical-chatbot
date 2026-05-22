'use client';

import { TOKENS } from '../../lib/tokens';
import { CHILDREN, type Dose, type DoseStatus } from '../../lib/data';
import { btnPrimary } from '../../lib/styles';
import { Card, PageHeader, StatusPill } from '../Primitives';
import { Icon } from '../Icon';
import { DoseRow } from '../widgets/DoseRow';

interface Props {
  doses: Dose[];
  mark: (id: string, status: DoseStatus) => void;
}

export function MedicinesPage({ doses, mark }: Props) {
  return (
    <div data-screen-label="Desktop · Medicines">
      <PageHeader
        eyebrow="Schedules saved by you"
        title="Medicines"
        subtitle="Mark doses as taken, snoozed, or skipped. MedOS Family does not change dosage."
        action={<button style={btnPrimary}><Icon name="plus" size={13}/> Add medicine</button>}
      />

      <Card title="Today's doses" style={{ marginBottom: 16 }}>
        {doses.map((d) => <DoseRow key={d.id} dose={d} onMark={mark}/>)}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {CHILDREN.map((c) => (
          <Card key={c.id} title={`${c.name} · active prescriptions`}>
            {(c.activeMeds.length ? c.activeMeds : ['No active prescriptions']).map((m, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: TOKENS.primarySoft,
                  color: TOKENS.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="pill" size={16}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: TOKENS.ink, fontWeight: 600 }}>{m}</div>
                  <div style={{ fontSize: 11, color: TOKENS.ink3 }}>From prescription · 08:00, 20:00</div>
                </div>
                {c.activeMeds.length > 0 && <StatusPill tone="info">Active</StatusPill>}
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

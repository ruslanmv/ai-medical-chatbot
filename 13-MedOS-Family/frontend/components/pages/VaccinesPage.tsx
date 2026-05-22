'use client';

import { TOKENS } from '../../lib/tokens';
import { CHILDREN, VACCINES } from '../../lib/data';
import { btnPrimary, linkStyle } from '../../lib/styles';
import { Card, PageHeader } from '../Primitives';
import { Icon } from '../Icon';
import { VaccineRow } from '../widgets/VaccineRow';

export function VaccinesPage() {
  return (
    <div data-screen-label="Desktop · Vaccines">
      <PageHeader
        eyebrow="Schedule · Italy · ASL Roma 1"
        title="Vaccines"
        subtitle="A simple checklist per child. Confirm timing with your pediatrician."
        action={<button style={btnPrimary}><Icon name="plus" size={13}/> Add record</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {CHILDREN.map((c) => (
          <Card
            key={c.id}
            title={`${c.name} · ${c.age}`}
            action={<a style={linkStyle}>Attach certificate</a>}
          >
            {(VACCINES[c.id] || []).map((v) => <VaccineRow key={v.name} v={v}/>)}
            <div style={{
              marginTop: 12, padding: 10, background: TOKENS.surfaceMuted, borderRadius: 8,
              fontSize: 11, color: TOKENS.ink3, lineHeight: 1.5,
            }}>
              Schedule guidance only. Confirm with your pediatrician or local ASL.
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import { TOKENS } from '../../lib/tokens';
import { Card, PageHeader } from '../Primitives';
import { Icon } from '../Icon';

const RECORDS = [
  'Hexavalent certificate · Leo',
  'MMR certificate · Mateo',
  'Cetirizine prescription · Leo',
  'Lab report · May 2025',
  'Pediatrician notes · Apr',
  'Growth chart · Q1',
];

export function RecordsPage() {
  return (
    <div data-screen-label="Desktop · Records">
      <PageHeader
        eyebrow="Document vault"
        title="Records"
        subtitle="Vaccine certificates, prescriptions, lab reports — kept private."
      />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {RECORDS.map((t) => (
            <div key={t} style={{
              padding: 14, border: `1px solid ${TOKENS.border}`,
              borderRadius: 10, background: TOKENS.surfaceMuted,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <Icon name="doc" size={20}/>
              <div style={{ fontSize: 12.5, color: TOKENS.ink, fontWeight: 500 }}>{t}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

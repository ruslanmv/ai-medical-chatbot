'use client';

import { TOKENS } from '../../lib/tokens';
import { Card } from '../Primitives';
import { Icon } from '../Icon';
import { btnGhost, btnPrimary, linkStyle } from '../../lib/styles';

export function DoctorSummary() {
  return (
    <Card title="Pediatrician summary" action={<a style={linkStyle}>Customize</a>}>
      <div style={{ fontSize: 12.5, color: TOKENS.ink2, lineHeight: 1.55, marginBottom: 14 }}>
        A clean, printable summary for your child&apos;s next visit. Includes vaccines, active medicines,
        recent symptoms and temperatures, growth, and attached documents.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={btnPrimary}><Icon name="download" size={13}/> Export PDF — Leo</button>
        <button style={btnGhost}><Icon name="download" size={13}/> Export PDF — Mateo</button>
      </div>
      <div style={{
        marginTop: 14, padding: 12, background: TOKENS.primarySoft, borderRadius: 9,
        fontSize: 11.5, color: TOKENS.primaryInk, lineHeight: 1.5,
      }}>
        MedOS Family organizes records — it does not diagnose, prescribe, or change dosage.
        Always confirm schedules with your pediatrician.
      </div>
    </Card>
  );
}

'use client';

import { CHILDREN } from '../../lib/data';
import { btnPrimary } from '../../lib/styles';
import { Card, Detail, PageHeader } from '../Primitives';
import { Icon } from '../Icon';
import { ChildHero } from '../widgets/ChildHero';

export function ChildrenPage() {
  return (
    <div data-screen-label="Desktop · Children">
      <PageHeader
        eyebrow="2 children · 1 family"
        title="Your children"
        subtitle="Tap a profile to see vaccines, medicines, notes and records."
        action={<button style={btnPrimary}><Icon name="plus" size={13}/> Add child</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {CHILDREN.map((c) => <ChildHero key={c.id} child={c}/>)}
      </div>

      {CHILDREN.map((c) => (
        <Card key={c.id} title={`${c.name} · profile`} style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <Detail label="Date of birth"     v={c.dob}/>
            <Detail label="Blood group"       v={c.blood}/>
            <Detail label="Allergies"         v={(c.allergies?.join(', ')) || 'None recorded'}/>
            <Detail label="Pediatrician"      v={c.doctor || 'Dr. Neha Verma'}/>
            <Detail label="Last temperature"  v={`${c.lastTemp.toFixed(1)} °C`}/>
            <Detail label="Weight"            v={c.weight}/>
            <Detail label="Active medicines"  v={c.activeMeds.length ? c.activeMeds.join(', ') : 'None'}/>
            <Detail label="Last note"         v={c.lastNote}/>
          </div>
        </Card>
      ))}
    </div>
  );
}

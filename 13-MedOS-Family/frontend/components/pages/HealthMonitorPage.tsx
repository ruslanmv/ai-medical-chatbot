'use client';

import { CHILDREN } from '../../lib/data';
import { Card, Detail, PageHeader } from '../Primitives';

export function HealthMonitorPage() {
  return (
    <div data-screen-label="Desktop · Health Monitor">
      <PageHeader
        eyebrow="Vitals"
        title="Health monitor"
        subtitle="Temperature, weight, growth — recorded by you."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {CHILDREN.map((c) => (
          <Card key={c.id} title={c.name}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <Detail label="Last temperature" v={`${c.lastTemp.toFixed(1)} °C`}/>
              <Detail label="Weight"           v={c.weight}/>
              <Detail label="Last note"        v={c.lastNote}/>
              <Detail label="Status"           v={c.statusLabel}/>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

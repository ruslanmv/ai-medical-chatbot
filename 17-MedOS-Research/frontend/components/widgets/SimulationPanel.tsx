'use client';

import { Link, Panel, Tag } from '../Primitives';

const ROWS: Array<[string, string]> = [
  ['Method', 'Whole-brain rate model (TVB)'],
  ['Assumptions', 'Altered inhibitory–excitatory balance; static connectome; homogeneous populations'],
  ['Limitations', 'No individual variability; no plasticity adaptation; coarse temporal resolution'],
  ['Reproducibility', 'Code, parameters and data will be published on completion'],
];

export function SimulationPanel() {
  return (
    <Panel title="Simulation Lab" action={<Link>View all simulations</Link>}>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          color: 'var(--ink-3)', letterSpacing: 0.4, marginBottom: 6,
        }}>Planned simulation</div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
            Thalamocortical network model — GABAergic modulation
          </div>
          <Tag tone="silico">Planned</Tag>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
        {ROWS.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <div style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{k}</div>
            <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{v}</div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
          <div style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Risk class</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
            }}>R2</span>
            <span style={{ color: '#c2410c', fontSize: 12.5, fontWeight: 600 }}>Moderate risk</span>
          </div>
        </div>
      </div>
      <Link>Go to simulation lab</Link>
    </Panel>
  );
}

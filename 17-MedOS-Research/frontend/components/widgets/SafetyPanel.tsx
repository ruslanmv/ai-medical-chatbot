'use client';

import { Icon } from '../Icon';
import { Link, Panel } from '../Primitives';

export function SafetyPanel() {
  return (
    <Panel title="Safety Review" action={<Link>View all</Link>}>
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
        padding: 14, display: 'flex', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: '#fee2e2',
          color: '#dc2626', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="Alert" size={16}/></div>
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: '#7f1d1d' }}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Blocked</div>
          <div><strong>Claim:</strong> &ldquo;Compound X cures tinnitus at 50 mg twice daily.&rdquo;</div>
          <div style={{ marginTop: 4 }}>
            <strong>Reason:</strong> Overstated efficacy claim; insufficient clinical evidence; potential safety risk.
          </div>
        </div>
      </div>
      <div style={{
        background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12,
        padding: 14, display: 'flex', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: '#d1fae5',
          color: '#047857', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="Check" size={16}/></div>
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: '#064e3b' }}>
          <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Revised (safe)</div>
          <div>
            <strong>Safer rewrite:</strong> &ldquo;Compound X showed improvements in tinnitus severity in
            preclinical models; human safety and efficacy are not established.&rdquo;
          </div>
        </div>
      </div>
      <Link>Go to safety review</Link>
    </Panel>
  );
}

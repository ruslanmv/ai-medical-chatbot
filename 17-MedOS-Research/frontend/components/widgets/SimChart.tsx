'use client';

// Simple parameter-sweep preview: three sine waves on a dotted grid.
export function SimChart() {
  const pts = (offset: number, amp: number) => {
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const x = i * 10;
      const y = 100 - Math.sin((i + offset) / 6) * amp - amp / 2;
      d += (i ? 'L' : 'M') + x + ',' + y + ' ';
    }
    return d;
  };

  return (
    <svg viewBox="0 0 600 130" style={{ width: '100%', height: '100%' }}>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" x2="600" y1={i * 30 + 10} y2={i * 30 + 10}
          stroke="#e2e8f0" strokeDasharray="3,3"/>
      ))}
      <path d={pts(0, 30)}  fill="none" stroke="#7c3aed" strokeWidth="2"/>
      <path d={pts(15, 22)} fill="none" stroke="#0d9488" strokeWidth="2"/>
      <path d={pts(30, 18)} fill="none" stroke="#f59e0b" strokeWidth="2"/>
      <text x="10"  y="125" fontSize="10" fill="#94a3b8" fontFamily="Inter, sans-serif">0 ms</text>
      <text x="280" y="125" fontSize="10" fill="#94a3b8" fontFamily="Inter, sans-serif">300 ms</text>
      <text x="560" y="125" fontSize="10" fill="#94a3b8" fontFamily="Inter, sans-serif">600 ms</text>
    </svg>
  );
}

export function RiskBadge({ tone, code }: { tone: 'green' | 'orange' | 'red'; code: string }) {
  const colors = {
    green:  { bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
    orange: { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' },
    red:    { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  }[tone];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: colors.bg, color: colors.fg, border: `1px solid ${colors.bd}`,
    }}>{code}</span>
  );
}

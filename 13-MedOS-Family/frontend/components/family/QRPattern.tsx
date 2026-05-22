'use client';

import { TOKENS } from '../../lib/tokens';

// Deterministic faux-QR pattern — visual only. Faithful port of the design.
export function QRPattern({ size = 180 }: { size?: number }) {
  const cells = 21;
  const c = size / cells;
  const seed = (i: number, j: number) => ((i * 73 + j * 151 + i * j * 7) % 100);

  const pattern: Array<[number, number]> = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const inFinder =
        (i < 7 && j < 7) ||
        (i < 7 && j >= cells - 7) ||
        (i >= cells - 7 && j < 7);
      if (inFinder) {
        const li = i < 7 ? i : i - (cells - 7);
        const lj = j < 7 ? j : j - (cells - 7);
        const isRing = li === 0 || li === 6 || lj === 0 || lj === 6;
        const isCenter = li >= 2 && li <= 4 && lj >= 2 && lj <= 4;
        if (isRing || isCenter) pattern.push([i, j]);
        continue;
      }
      if (seed(i, j) > 55) pattern.push([i, j]);
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <rect width={size} height={size} fill="#fff"/>
      {pattern.map(([i, j], k) => (
        <rect key={k} x={j * c} y={i * c} width={c} height={c} fill={TOKENS.ink}/>
      ))}
      <rect x={size / 2 - 18} y={size / 2 - 18} width={36} height={36} fill="#fff"/>
      <rect x={size / 2 - 14} y={size / 2 - 14} width={28} height={28} rx={6} fill={TOKENS.primary}/>
      <text x={size / 2} y={size / 2 + 5} fill="#fff" fontSize="14"
            fontFamily="Fraunces, serif" textAnchor="middle" fontWeight="600">M</text>
    </svg>
  );
}

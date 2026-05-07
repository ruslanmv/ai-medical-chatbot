'use client';

interface NodeProps { x: number; y: number; label: string; color: string; sub: string }

function Node({ x, y, label, color, sub }: NodeProps) {
  return (
    <g>
      <rect x={x - 58} y={y - 22} width={116} height={44} rx={10}
        fill="#fff" stroke={color} strokeWidth="1.5"/>
      <text x={x} y={y - 2} textAnchor="middle"
        fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">
        {label}
      </text>
      <text x={x} y={y + 13} textAnchor="middle"
        fontSize="10" fill="#64748b" fontFamily="Inter, sans-serif">
        {sub}
      </text>
    </g>
  );
}

interface EdgeProps { x1: number; y1: number; x2: number; y2: number; color?: string; dash?: boolean }

function Edge({ x1, y1, x2, y2, color = '#94a3b8', dash = false }: EdgeProps) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth="1.6"
      strokeDasharray={dash ? '4,4' : ''}
      markerEnd="url(#arrow)"
    />
  );
}

export function PathwayDiagram() {
  return (
    <svg viewBox="0 0 800 280" style={{ width: '100%', height: '100%' }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/>
        </marker>
      </defs>

      <Edge x1={118} y1={80}  x2={232} y2={80}/>
      <Edge x1={290} y1={80}  x2={404} y2={140}/>
      <Edge x1={290} y1={80}  x2={404} y2={220} color="#ef4444" dash/>
      <Edge x1={462} y1={140} x2={576} y2={80}/>
      <Edge x1={462} y1={220} x2={576} y2={220}/>
      <Edge x1={634} y1={80}  x2={720} y2={140}/>
      <Edge x1={634} y1={220} x2={720} y2={140}/>

      <Node x={60}  y={80}  label="Cochlear damage"     color="#cbd5e1" sub="Trigger"/>
      <Node x={290} y={80}  label="Auditory nerve"      color="#0d9488" sub="Reduced input"/>
      <Node x={462} y={140} label="Central gain ↑"      color="#7c3aed" sub="Compensation"/>
      <Node x={462} y={220} label="GABA ↓ / NMDA ↑"     color="#ef4444" sub="Imbalance"/>
      <Node x={634} y={80}  label="Cortical hyperactivity" color="#ea580c" sub="Maladaptive"/>
      <Node x={634} y={220} label="Plasticity"          color="#2563eb" sub="Reorganization"/>
      <Node x={750} y={140} label="Tinnitus"            color="#db2777" sub="Perception"/>
    </svg>
  );
}

'use client';

import { TOKENS } from '../../lib/tokens';
import { ADULTS, CHILDREN, type FamilyMember } from '../../lib/data';
import { Icon } from '../Icon';
import { TreeNode } from './TreeNode';

interface Props { onOpen: (m: FamilyMember) => void }

export function FamilyTree({ onOpen }: Props) {
  const grand  = ADULTS.find((a) => a.role.includes('Grandmother'));
  const father = ADULTS.find((a) => a.role.includes('Father'));
  const mother = ADULTS.find((a) => a.role.includes('Mother'));
  const C1 = TOKENS.borderStrong;

  return (
    <div style={{
      position: 'relative', padding: '32px 24px 24px',
      background: `linear-gradient(180deg, ${TOKENS.surfaceMuted} 0%, ${TOKENS.surface} 100%)`,
      borderRadius: 12,
    }}>
      {/* Row 1: grandparent */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        {grand && <TreeNode m={grand} onOpen={onOpen}/>}
      </div>

      {/* Connector down */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 0 }}>
        <div style={{ width: 2, height: 36, background: C1 }}/>
      </div>

      {/* Row 2: parents — connected by horizontal bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 120, zIndex: 1 }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 296, height: 2, background: C1, zIndex: 0,
        }}/>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 28, height: 28, borderRadius: 99, background: TOKENS.surface,
          border: `2px solid ${TOKENS.primary}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
          boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
        }}>
          <Icon name="heart" size={13} color={TOKENS.primary}/>
        </div>
        {father && <div style={{ position: 'relative', zIndex: 2 }}><TreeNode m={father} onOpen={onOpen} size="lg"/></div>}
        {mother && <div style={{ position: 'relative', zIndex: 2 }}><TreeNode m={mother} onOpen={onOpen} size="lg"/></div>}
      </div>

      {/* Connector down with split */}
      <div style={{ position: 'relative', height: 48 }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: 22, background: C1, transform: 'translateX(-50%)' }}/>
        <div style={{ position: 'absolute', left: 'calc(50% - 110px)', top: 22, width: 220, height: 2, background: C1 }}/>
        <div style={{ position: 'absolute', left: 'calc(50% - 110px)', top: 22, width: 2, height: 26, background: C1 }}/>
        <div style={{ position: 'absolute', left: 'calc(50% + 110px)', top: 22, width: 2, height: 26, background: C1 }}/>
      </div>

      {/* Row 3: children */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 44 }}>
        {CHILDREN.map((c) => <TreeNode key={c.id} m={c} onOpen={onOpen}/>)}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18,
        marginTop: 28, paddingTop: 18, borderTop: `1px solid ${TOKENS.border}`,
      }}>
        <LegendDot color={TOKENS.good}>Healthy / On track</LegendDot>
        <LegendDot color={TOKENS.amber}>Monitoring</LegendDot>
        <LegendDot color={TOKENS.coral}>Needs care</LegendDot>
        <div style={{ width: 1, background: TOKENS.border }}/>
        <div style={{ fontSize: 11, color: TOKENS.ink3 }}>Click any member to open their profile</div>
      </div>
    </div>
  );
}

function LegendDot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TOKENS.ink2 }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: color }}/> {children}
    </div>
  );
}

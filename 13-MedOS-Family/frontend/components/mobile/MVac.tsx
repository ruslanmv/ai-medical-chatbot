'use client';

import { TOKENS } from '../../lib/tokens';
import { CHILDREN, VACCINES } from '../../lib/data';
import { Avatar } from '../Primitives';
import { VaccineRow } from '../widgets/VaccineRow';
import { MCard, MHeader } from './MobileBits';

export function MVac() {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 14px' }}>
      <MHeader sub="Vaccine tracker" title="Schedules"/>
      {CHILDREN.map((c) => (
        <MCard
          key={c.id}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar member={c} size={22}/> {c.name}
            </span>
          }
        >
          {VACCINES[c.id]!.map((v) => <VaccineRow key={v.name + v.date} v={v}/>)}
        </MCard>
      ))}
      <div style={{
        padding: 12, background: TOKENS.primarySoft, borderRadius: 10,
        fontSize: 11, color: TOKENS.primaryInk, lineHeight: 1.5,
      }}>
        Schedules follow the Italian Ministry of Health recommendations and are guidance only.
        Always confirm with your pediatrician or local ASL.
      </div>
    </div>
  );
}

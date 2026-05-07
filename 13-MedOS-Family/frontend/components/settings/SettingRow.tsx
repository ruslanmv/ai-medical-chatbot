'use client';

import { TOKENS } from '../../lib/tokens';

interface Props {
  label: string;
  desc?: string;
  control: React.ReactNode;
}

export function SettingRow({ label, desc, control }: Props) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16, padding: '12px 0', borderBottom: `1px solid ${TOKENS.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink }}>{label}</div>
        {desc && (
          <div style={{ fontSize: 12, color: TOKENS.ink2, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

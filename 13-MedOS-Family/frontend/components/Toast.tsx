'use client';

import { TOKENS } from '../lib/tokens';

export function Toast({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 18px', background: TOKENS.ink, color: '#fff',
      borderRadius: 99, fontSize: 12.5, fontWeight: 500,
      zIndex: 200,
    }}>{message}</div>
  );
}

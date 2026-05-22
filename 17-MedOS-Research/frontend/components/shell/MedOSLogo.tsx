'use client';

export function MedOSLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(37,99,235,.35), inset 0 -1px 0 rgba(255,255,255,.2)',
      }}>
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none">
          <path d="M12 21s-7-4.5-7-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.5-7 10-7 10h-2z" fill="white" opacity="0.95"/>
          <circle cx="9"  cy="10"   r="1.4" fill="#2563eb"/>
          <circle cx="15" cy="10"   r="1.4" fill="#2563eb"/>
          <circle cx="12" cy="13.5" r="1.4" fill="#2563eb"/>
          <path d="M9 10l3 3.5M15 10l-3 3.5" stroke="#2563eb" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2, color: '#0f172a' }}>
        MedOS <span style={{ color: '#2563eb', fontWeight: 600 }}>Research</span>
      </div>
    </div>
  );
}

// Shared UI primitives: StatusPill, Card, Avatar, RiskDot, Toggle, Detail, PageHeader.
'use client';

import type { CSSProperties, ReactNode } from 'react';
import { TOKENS, type Tone, type Risk } from '../lib/tokens';
import type { FamilyMember } from '../lib/data';

// ───── StatusPill ─────────────────────────────────────────────────────────

const TONE_MAP: Record<Tone, { bg: string; fg: string }> = {
  good:  { bg: TOKENS.goodSoft,    fg: '#3d6a42'        },
  watch: { bg: TOKENS.amberSoft,   fg: '#7a5916'        },
  care:  { bg: TOKENS.coralSoft,   fg: '#8a3c25'        },
  info:  { bg: TOKENS.primarySoft, fg: TOKENS.primaryInk },
  muted: { bg: '#eeeae0',          fg: TOKENS.ink2      },
};

export function StatusPill({ tone = 'good', children }: { tone?: Tone; children: ReactNode }) {
  const s = TONE_MAP[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999,
      background: s.bg, color: s.fg,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.1,
    }}>{children}</span>
  );
}

// ───── RiskDot ────────────────────────────────────────────────────────────

export function RiskDot({ level }: { level: Risk }) {
  const map: Record<Risk, string> = {
    low: TOKENS.good, good: TOKENS.good,
    moderate: TOKENS.amber,
    high: TOKENS.coral,
  };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: 99,
      background: map[level] || TOKENS.ink3,
      display: 'inline-block',
    }}/>
  );
}

// ───── Card ───────────────────────────────────────────────────────────────

interface CardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  style?: CSSProperties;
}

export function Card({ title, action, children, padded = true, style }: CardProps) {
  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      ...style,
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: `1px solid ${TOKENS.border}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink, letterSpacing: 0.1 }}>{title}</div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 18 : 0 }}>{children}</div>
    </div>
  );
}

// ───── Avatar ─────────────────────────────────────────────────────────────

export function Avatar({
  member, size = 44,
}: { member: Pick<FamilyMember, 'avatar' | 'avatarColor'>; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 99,
      background: member.avatarColor, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500,
      fontSize: size * 0.42, letterSpacing: 0.5, flexShrink: 0,
    }}>{member.avatar}</div>
  );
}

// ───── Toggle ─────────────────────────────────────────────────────────────

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 38, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
      background: on ? TOKENS.primary : TOKENS.borderStrong,
      position: 'relative', padding: 0, transition: 'background 0.15s',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 99,
        background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}/>
    </button>
  );
}

// ───── Detail (small label/value pair used in profiles) ───────────────────

export function Detail({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: TOKENS.ink3, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 14, color: TOKENS.ink, fontWeight: 500, marginTop: 4 }}>{v}</div>
    </div>
  );
}

// ───── PageHeader ─────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-end', gap: 16, justifyContent: 'space-between' }}>
      <div>
        {eyebrow && (
          <div style={{ fontSize: 12, color: TOKENS.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{
          fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400,
          fontSize: 30, color: TOKENS.ink, margin: '6px 0 4px', letterSpacing: -0.2,
        }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 14, color: TOKENS.ink2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// ───── helpers ────────────────────────────────────────────────────────────

export const toneOfStatus = (s: 'good' | 'watch' | 'care'): Tone =>
  s === 'good' ? 'good' : s === 'watch' ? 'watch' : 'care';

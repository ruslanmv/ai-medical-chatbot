'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { TAG_TONES, type TagTone, VERDICT_TONES, type Verdict, type GateState, type Kpi } from '../lib/data';

// ───── Panel ──────────────────────────────────────────────────────

export function Panel({
  title, info, action, children, style,
}: {
  title: ReactNode; info?: ReactNode; action?: ReactNode;
  children: ReactNode; style?: CSSProperties;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 14,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, letterSpacing: -0.1 }}>
          {title}
          {info && (
            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 6 }}>
              {info}
            </span>
          )}
        </h3>
        <div style={{ flex: 1 }}/>
        {action}
      </div>
      {children}
    </div>
  );
}

// ───── Tag ────────────────────────────────────────────────────────

export function Tag({ tone = 'review', children }: { tone?: TagTone; children: ReactNode }) {
  const t = TAG_TONES[tone] || TAG_TONES.review;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: '3px 7px', borderRadius: 999,
      background: t.bg, color: t.fg, letterSpacing: 0.1,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ───── Pill ───────────────────────────────────────────────────────

export function Pill({
  bg, fg, dot, children,
}: { bg: string; fg: string; dot?: string; children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600, padding: '5px 10px',
      borderRadius: 999, background: bg, color: fg,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }}/>}
      {children}
    </span>
  );
}

// ───── Link (with arrow) ──────────────────────────────────────────

export function Link({ children }: { children: ReactNode }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={{
        fontSize: 12.5, color: 'var(--brand-600)', fontWeight: 600,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        paddingTop: 8,
      }}
    >{children} <Icon name="ArrowRight" size={13}/></a>
  );
}

// ───── VerdictBadge ───────────────────────────────────────────────

export function VerdictBadge({ v }: { v: Verdict }) {
  const t = VERDICT_TONES[v];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
      background: t.bg, color: t.fg,
    }}>{v}</span>
  );
}

// ───── GateDot (publication studio) ───────────────────────────────

export function GateDot({ v }: { v: GateState }) {
  if (v === 'ok') {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#d1fae5',
        color: '#059669',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="Check" size={12} strokeWidth={3}/></div>
    );
  }
  if (v === 'pending') {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fef3c7',
        color: '#d97706',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="Clock" size={12}/></div>
    );
  }
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9',
      color: '#94a3b8',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700,
    }}>—</div>
  );
}

// ───── KpiCard ────────────────────────────────────────────────────

export function KpiCard({ k }: { k: Kpi }) {
  const subColor =
    k.subTone === 'green' ? '#16a34a'
    : k.subTone === 'orange' ? '#d97706'
    : 'var(--ink-3)';
  return (
    <div style={{
      flex: 1, minWidth: 0, background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 14,
      padding: 16, display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: k.iconBg, color: k.iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={k.icon} size={20} stroke={k.iconColor}/>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{k.label}</div>
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: -0.5,
          color: 'var(--ink)', lineHeight: 1.1, marginTop: 2,
        }}>{k.value}</div>
        <div style={{ fontSize: 11.5, color: subColor, marginTop: 2, fontWeight: 500 }}>{k.sub}</div>
      </div>
    </div>
  );
}

// ───── Buttons ────────────────────────────────────────────────────

export function PrimaryBtn({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 10,
      border: 'none', background: 'var(--brand)',
      color: '#fff', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,.25)',
    }}>
      {icon && <Icon name={icon} size={15} stroke="#fff"/>}
      {children}
    </button>
  );
}

export function SecondaryBtn({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--surface)',
      color: 'var(--ink-2)', fontSize: 13, fontWeight: 500,
      cursor: 'pointer',
    }}>
      {icon && <Icon name={icon} size={15}/>}
      {children}
    </button>
  );
}

// ───── Page chrome ────────────────────────────────────────────────

export function PageHeader({
  title, subtitle, actions, badges,
}: {
  title: string; subtitle?: string; actions?: ReactNode; badges?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: 'var(--ink)' }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</div>
        )}
        {badges && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{badges}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function ScreenWrap({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '24px 28px 0', overflow: 'auto', height: '100%' }}>
      {children}
    </div>
  );
}

export function ResearchOnlyFooter() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14,
      padding: '14px 18px', margin: '8px 0 24px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#dbeafe', color: '#2563eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="ShieldCheck" size={18}/>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>
        <strong style={{ color: 'var(--ink)' }}>Research workflows only</strong>{' '}
        — not diagnosis, prescription, or patient-specific treatment advice.
        <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>
          MedOS Research is not a substitute for professional judgment.
        </span>
      </div>
      <a href="#" onClick={(e) => e.preventDefault()} style={{
        fontSize: 12.5, color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        Learn more <Icon name="ArrowUpRight" size={13}/>
      </a>
    </div>
  );
}

// ───── Stat (used in disease workspace and detail rails) ──────────

export function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 12,
    }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 700, letterSpacing: -0.5,
        color: 'var(--ink)', marginTop: 2,
      }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</div>
    </div>
  );
}

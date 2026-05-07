'use client';

import { Icon, type IconName } from '../Icon';
import { Gesture, PhoneFrame } from './PhoneFrame';
import { MetricCard, MNavBar, MTopBar, QuickAction, type MTab } from './MobileBits';

interface ActivityItem { i: IconName; c: string; bg: string; t: string; when: string }

const ACTIVITY: ActivityItem[] = [
  { i: 'FileText',  c: '#4f46e5', bg: '#eef2ff', t: 'Evidence brief "Central gain pathways" updated', when: '2h ago' },
  { i: 'Pill',      c: '#7c3aed', bg: '#f5f3ff', t: 'Compound B moved to In-silico',                  when: '5h ago' },
  { i: 'Book',      c: '#0d9488', bg: '#ecfdf5', t: 'New paper imported: Kell et al., 2024',          when: '6h ago' },
  { i: 'Shield',    c: '#d97706', bg: '#fef3c7', t: 'Safety gate R2 requires review',                 when: '8h ago' },
];

export function MobileHome({ onNav }: { onNav: (t: MTab) => void }) {
  return (
    <PhoneFrame>
      <MTopBar
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s-7-4.5-7-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.5-7 10-7 10h-2z" fill="white"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              MedOS <span style={{ color: 'var(--brand-600)', fontWeight: 600 }}>Research</span>
            </div>
          </div>
        }
        right={
          <button style={{
            width: 40, height: 40, border: 'none', background: 'transparent',
            position: 'relative', cursor: 'pointer', color: 'var(--ink-2)',
          }}>
            <Icon name="Bell" size={20}/>
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 999,
              background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>3</span>
          </button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Good morning, Arjun</h2>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: 'var(--brand-50)', color: 'var(--brand-600)',
          }}>Researcher</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
          Here&apos;s your research overview.
        </div>

        {/* Active project */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
          padding: 16, marginBottom: 12, position: 'relative',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--brand-600)',
            textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
          }}>Active project</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: 'var(--ink)' }}>
                Tinnitus mechanisms — central gain candidates
              </div>
              <div style={{
                fontSize: 12, color: 'var(--ink-3)', marginTop: 6,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>No patient data</span>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--ink-4)' }}/>
                <span>Research only</span>
              </div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#f5f3ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19a3 3 0 0 1-3-3c0-1.5.5-2.5 1-3.5.6-1.2 1.2-2 1.2-4.5a4.8 4.8 0 0 1 9.6 0c0 4-2.7 4.7-4 6.5-1 1.4-1.5 2-1.5 3a1.6 1.6 0 0 1-3.3 0"/>
                <path d="M14 9a2 2 0 0 0-4 0c0 .8.4 1 .8 1.5"/>
              </svg>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 6,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>68%</span>
            </div>
            <div style={{
              height: 6, borderRadius: 999,
              background: 'var(--slate-100)', overflow: 'hidden',
            }}>
              <div style={{
                width: '68%', height: '100%',
                background: 'linear-gradient(90deg, #60a5fa, #2563eb)',
              }}/>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 8 }}>Updated 2h ago</div>
        </div>

        {/* Metrics 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <MetricCard icon="Book"      iconBg="#eef2ff" iconFg="#4f46e5" label="Papers imported"    value="2,842" sub="+205 this week"     subTone="green"/>
          <MetricCard icon="Lightbulb" iconBg="#fff7ed" iconFg="#ea580c" label="Active hypotheses"  value="24"    sub="+3 this week"       subTone="green"/>
          <MetricCard icon="Pill"      iconBg="#f5f3ff" iconFg="#7c3aed" label="Candidate medicines" value="18"   sub="3 in deep review"/>
          <MetricCard icon="Shield"    iconBg="#fef3c7" iconFg="#d97706" label="Pending safety gates" value="4"  sub="Requires review"     subTone="orange"/>
        </div>

        {/* Recent activity */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Activity</h3>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            fontSize: 12, color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none',
          }}>View all</a>
        </div>
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 14, padding: '4px 14px', marginBottom: 16,
        }}>
          {ACTIVITY.map((a, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: idx < ACTIVITY.length - 1 ? '1px solid var(--slate-100)' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: a.bg, color: a.c,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}><Icon name={a.i} size={14}/></div>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.35 }}>{a.t}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{a.when}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          <QuickAction icon="Search"    label="Search literature"/>
          <QuickAction icon="Scale"     label="Compare candidates"/>
          <QuickAction icon="Lightbulb" label="New hypothesis"/>
          <QuickAction icon="Shield"    label="Safety review"/>
        </div>

        {/* Disclaimer */}
        <div style={{
          background: 'var(--brand-50)', border: '1px solid #bfdbfe', borderRadius: 12,
          padding: 12, textAlign: 'center', marginBottom: 8,
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-600)', marginBottom: 2 }}>
            Research only
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Not for diagnosis, prescription, or patient-specific treatment.
          </div>
        </div>
      </div>

      <MNavBar active="home" onChange={onNav}/>
      <Gesture/>
    </PhoneFrame>
  );
}

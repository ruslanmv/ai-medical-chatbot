'use client';

import { TOKENS } from '../../lib/tokens';
import { ALL_WIDGETS, ESSENTIAL_WIDGETS } from '../../lib/data';
import { btnGhost, btnPrimary } from '../../lib/styles';
import { StatusPill } from '../Primitives';
import type { Widgets } from '../../lib/useWidgets';

interface Props {
  widgets: Widgets;
  setWidgets: (next: Widgets) => void;
  onClose: () => void;
}

export function DashboardCustomizer({ widgets, setWidgets, onClose }: Props) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(40,30,15,.35)', zIndex: 80,
      }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 560, maxHeight: '82vh', overflow: 'auto',
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 14,
        boxShadow: '0 24px 60px rgba(40,30,15,.25)', zIndex: 81, padding: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: TOKENS.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Dashboard</div>
          <h3 style={{
            fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 22,
            margin: '4px 0 4px', color: TOKENS.ink,
          }}>Customize what you see</h3>
          <div style={{ fontSize: 13, color: TOKENS.ink2, lineHeight: 1.5 }}>
            Keep the dashboard minimal. The 3 essentials stay on. Add the rest only if you need them.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setWidgets(Object.fromEntries(
              ALL_WIDGETS.map((w) => [w.id, (ESSENTIAL_WIDGETS as readonly string[]).includes(w.id)]),
            ))}
            style={btnGhost}
          >Reset to essentials</button>
          <button
            onClick={() => setWidgets(Object.fromEntries(ALL_WIDGETS.map((w) => [w.id, true])))}
            style={btnGhost}
          >Show all</button>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={btnPrimary}>Done</button>
        </div>

        {ALL_WIDGETS.map((w, i) => {
          const on = widgets[w.id];
          return (
            <div key={w.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0',
              borderBottom: i < ALL_WIDGETS.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{w.label}</span>
                  {w.essential && <StatusPill tone="info">Essential</StatusPill>}
                </div>
                <div style={{ fontSize: 12, color: TOKENS.ink3, marginTop: 3 }}>{w.desc}</div>
              </div>
              <button
                onClick={() => !w.essential && setWidgets({ ...widgets, [w.id]: !on })}
                disabled={w.essential}
                style={{
                  width: 40, height: 22, borderRadius: 99, border: 'none',
                  background: on ? TOKENS.primary : '#d8d2c5',
                  position: 'relative', cursor: w.essential ? 'not-allowed' : 'pointer',
                  opacity: w.essential ? 0.6 : 1,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: on ? 20 : 2,
                  width: 18, height: 18, borderRadius: 99, background: '#fff',
                  transition: 'left .2s',
                }}/>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

'use client';

import { TOKENS } from '../../lib/tokens';
import { Icon, type IconName } from '../Icon';

interface Hour { t: string; temp: number; icon: IconName; uv: number }

const HOURS: Hour[] = [
  { t: '08:00', temp: 19, icon: 'sun',  uv: 2 },
  { t: '12:00', temp: 26, icon: 'sun',  uv: 8 },
  { t: '15:00', temp: 28, icon: 'sun',  uv: 9 },
  { t: '18:00', temp: 24, icon: 'sun',  uv: 4 },
  { t: '21:00', temp: 19, icon: 'drop', uv: 0 },
];

export function WeatherStrip() {
  return (
    <div style={{
      padding: 14, background: 'linear-gradient(135deg, #eaf2ec 0%, #f4ede0 100%)',
      borderRadius: 10, border: `1px solid ${TOKENS.border}`, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: TOKENS.amber }}><Icon name="sun" size={36} stroke={1.6}/></div>
          <div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, color: TOKENS.ink, lineHeight: 1 }}>
              26<span style={{ fontSize: 16, color: TOKENS.ink2 }}>°C</span>
            </div>
            <div style={{ fontSize: 11.5, color: TOKENS.ink2, marginTop: 3 }}>Sunny · Roma · feels 27°</div>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: TOKENS.ink2 }}>
          <Stat label="UV idx" value="9 · Very high" valueStyle={{ color: TOKENS.coral, fontWeight: 700, fontSize: 13 }}/>
          <Stat label="Humidity" value="54%" valueStyle={{ fontWeight: 600, fontSize: 13, color: TOKENS.ink }}/>
          <Stat label="Wind" value="8 km/h" valueStyle={{ fontWeight: 600, fontSize: 13, color: TOKENS.ink }}/>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {HOURS.map((h) => (
          <div key={h.t} style={{
            padding: '8px 4px', background: 'rgba(255,255,255,.6)', borderRadius: 7,
            textAlign: 'center', fontSize: 11,
          }}>
            <div style={{ color: TOKENS.ink3 }}>{h.t}</div>
            <div style={{ color: h.icon === 'sun' ? TOKENS.amber : TOKENS.primary, margin: '4px 0' }}>
              <Icon name={h.icon} size={16}/>
            </div>
            <div style={{ fontWeight: 600, color: TOKENS.ink }}>{h.temp}°</div>
            <div style={{
              color: h.uv >= 8 ? TOKENS.coral : h.uv >= 5 ? TOKENS.amber : TOKENS.ink3,
              fontSize: 10, marginTop: 2,
            }}>UV {h.uv}</div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: 10, background: 'rgba(255,255,255,.7)',
        borderRadius: 8, fontSize: 11.5, color: TOKENS.ink2, lineHeight: 1.5,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Icon name="alert" size={14} stroke={2}/>
        <div>
          <strong style={{ color: TOKENS.coral }}>UV very high 11:00–16:00.</strong> Apply SPF 50+ on
          exposed skin, use a hat for the children, prefer shade. Light cotton clothing recommended.
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 10.5, color: TOKENS.ink3, textAlign: 'right' }}>
        Source · Meteo Aeronautica · ARPA Lazio
      </div>
    </div>
  );
}

function Stat({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div>
      <div style={{ color: TOKENS.ink3, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 10 }}>{label}</div>
      <div style={{ marginTop: 2, ...valueStyle }}>{value}</div>
    </div>
  );
}

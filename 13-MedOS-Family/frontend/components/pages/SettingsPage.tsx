'use client';

import { useEffect, useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { ALL_WIDGETS } from '../../lib/data';
import { btnGhost, btnPrimary, inputStyle } from '../../lib/styles';
import { Card, PageHeader, StatusPill, Toggle } from '../Primitives';
import { Icon, type IconName } from '../Icon';
import { QRPattern } from '../family/QRPattern';
import { SettingRow } from '../settings/SettingRow';
import type { SettingsSection } from '../../lib/nav';
import type { Widgets } from '../../lib/useWidgets';

interface Props {
  widgets: Widgets;
  setCustomizing: (open: boolean) => void;
  initialSection?: SettingsSection;
}

interface SectionDef { id: SettingsSection; label: string; icon: IconName }

const SECTIONS: SectionDef[] = [
  { id: 'general',          label: 'General',                  icon: 'gear'    },
  { id: 'profile',          label: 'Profile & family admin',   icon: 'kids'    },
  { id: 'personalization',  label: 'Personalization',          icon: 'heart'   },
  { id: 'privacy',          label: 'Privacy & data',           icon: 'heart'   },
  { id: 'notifications',    label: 'Notifications',            icon: 'bell'    },
  { id: 'devices',          label: 'Linked devices',           icon: 'syringe' },
  { id: 'ollama',           label: 'OllaBridge Cloud · AI',    icon: 'doc'     },
  { id: 'help',             label: 'Help & support',           icon: 'alert'   },
  { id: 'about',            label: 'About & legal',            icon: 'alert'   },
  { id: 'logout',           label: 'Log out',                  icon: 'skip'    },
];

export function SettingsPage({ widgets, setCustomizing, initialSection }: Props) {
  const [section, setSection] = useState<SettingsSection>(initialSection || 'general');
  useEffect(() => { if (initialSection) setSection(initialSection); }, [initialSection]);

  const [bridge, setBridge] = useState({ paired: false });
  const [toggles, setToggles] = useState({
    darkMode: false, biometric: true, telemetry: false,
    autoSync: true, e2ee: true, aiLocal: true, aiCloud: false,
  });

  const t = (k: keyof typeof toggles) => toggles[k];
  const setT = (k: keyof typeof toggles) => (v: boolean) => setToggles({ ...toggles, [k]: v });

  return (
    <div data-screen-label="Desktop · Settings">
      <PageHeader
        eyebrow="Account · privacy · AI"
        title="Settings"
        subtitle="Manage your MedOS Family preferences, AI assistant, and connected services."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18 }}>
        {/* Section nav */}
        <nav style={{
          background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 14,
          padding: 8, height: 'fit-content', position: 'sticky', top: 24,
        }}>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%',
              borderRadius: 9, border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left',
              background: section === s.id ? TOKENS.primarySoft : 'transparent',
              color: section === s.id ? TOKENS.primaryInk : TOKENS.ink2,
              fontSize: 13, fontWeight: section === s.id ? 600 : 500, marginBottom: 2,
            }}>
              <Icon name={s.icon} size={15}/> {s.label}
            </button>
          ))}
        </nav>

        {/* Section content */}
        <div>
          {section === 'general' && (
            <Card title="General preferences">
              <SettingRow label="Language" desc="Interface language for the app" control={
                <select style={{ ...inputStyle, width: 160 }} defaultValue="en">
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                  <option value="es">Español</option>
                </select>
              }/>
              <SettingRow label="Region" desc="Used for local health alerts and vaccine schedules" control={
                <select style={{ ...inputStyle, width: 200 }} defaultValue="lazio">
                  <option value="lazio">Italy · Lazio · Roma</option>
                  <option value="lombardia">Italy · Lombardia</option>
                  <option value="other">Other…</option>
                </select>
              }/>
              <SettingRow label="Time zone" desc="Used for medicine reminders and scheduling" control={
                <select style={{ ...inputStyle, width: 200 }} defaultValue="rome">
                  <option value="rome">Europe/Rome (UTC+1)</option>
                </select>
              }/>
              <SettingRow label="Units" desc="Temperature, weight, and height" control={
                <select style={{ ...inputStyle, width: 160 }} defaultValue="metric">
                  <option value="metric">Metric (°C, kg)</option>
                  <option value="imperial">Imperial (°F, lb)</option>
                </select>
              }/>
              <SettingRow label="Dark mode" control={<Toggle on={t('darkMode')} onChange={setT('darkMode')}/>}/>
              <SettingRow
                label="Customize dashboard widgets"
                desc={`${Object.values(widgets).filter(Boolean).length} of ${ALL_WIDGETS.length} widgets enabled`}
                control={<button onClick={() => setCustomizing(true)} style={btnGhost}>Customize</button>}
              />
            </Card>
          )}

          {section === 'profile' && (
            <Card title="Family admin · Marco Romano">
              <SettingRow label="Display name" control={<input style={{ ...inputStyle, width: 220 }} defaultValue="Marco Romano"/>}/>
              <SettingRow label="Email"        control={<input style={{ ...inputStyle, width: 260 }} defaultValue="marco.romano@example.it"/>}/>
              <SettingRow label="Family role"  desc="You manage 2 children under guardian consent" control={<StatusPill tone="info">Family admin</StatusPill>}/>
              <SettingRow label="Biometric unlock" desc="Face ID / fingerprint to open the app" control={<Toggle on={t('biometric')} onChange={setT('biometric')}/>}/>
              <SettingRow label="Change password" control={<button style={btnGhost}>Change…</button>}/>
              <SettingRow label="Sign out of all devices" control={
                <button style={{ ...btnGhost, color: TOKENS.coral, borderColor: TOKENS.coralSoft }}>Sign out</button>
              }/>
            </Card>
          )}

          {section === 'personalization' && (
            <Card title="Personalization · Memory & style">
              <SettingRow label="AI memory" desc="Let MedOS remember your family's preferences across chats" control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Tone of voice" desc="How AI assistant and reminders speak to you" control={
                <select style={{ ...inputStyle, width: 200 }} defaultValue="warm">
                  <option value="warm">Warm & friendly</option>
                  <option value="clinical">Clinical & concise</option>
                  <option value="reassuring">Reassuring</option>
                </select>
              }/>
              <SettingRow label="Display density" control={
                <select style={{ ...inputStyle, width: 160 }} defaultValue="comfortable">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              }/>
              <SettingRow label="Accent color" control={
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#2563eb', '#16a34a', '#7c3aed', '#a85a3e'].map((c) => (
                    <button key={c} style={{
                      width: 24, height: 24, borderRadius: 99, background: c,
                      border: c === '#2563eb' ? `2px solid ${TOKENS.ink}` : '2px solid transparent',
                      cursor: 'pointer',
                    }}/>
                  ))}
                </div>
              }/>
              <SettingRow label="Saved preferences" desc="Marco prefers Italian medicine names · 2 children · Roma" control={<button style={btnGhost}>Manage memory</button>}/>
              <SettingRow label="Reset personalization" control={
                <button style={{ ...btnGhost, color: TOKENS.coral, borderColor: TOKENS.coralSoft }}>Reset</button>
              }/>
            </Card>
          )}

          {section === 'privacy' && (
            <Card title="Privacy & data">
              <SettingRow label="End-to-end encryption" desc="All shared family data encrypted with keys only your devices hold" control={<Toggle on={t('e2ee')} onChange={setT('e2ee')}/>}/>
              <SettingRow label="Auto-sync to MedOS Cloud" desc="Encrypted backup across your linked devices" control={<Toggle on={t('autoSync')} onChange={setT('autoSync')}/>}/>
              <SettingRow label="Anonymous usage analytics" desc="Help improve MedOS — no health data is ever sent" control={<Toggle on={t('telemetry')} onChange={setT('telemetry')}/>}/>
              <SettingRow label="Export all family data" desc="Download a full JSON archive of every record" control={<button style={btnGhost}><Icon name="download" size={13}/> Export</button>}/>
              <SettingRow label="Delete family account" desc="Permanently remove all data — cannot be undone" control={
                <button style={{ ...btnGhost, color: TOKENS.coral, borderColor: TOKENS.coralSoft }}>Delete…</button>
              }/>
            </Card>
          )}

          {section === 'notifications' && (
            <Card title="Notifications">
              <SettingRow label="Push notifications"   control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Email reminders"      desc="Weekly summary every Monday at 8:00" control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Medicine doses"        control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Vaccine due dates"     desc="30 days, 7 days, and on-day reminders" control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Local outbreak alerts" desc="Only alerts within 30 km" control={<Toggle on={true} onChange={() => {}}/>}/>
              <SettingRow label="Quiet hours"           control={<input style={{ ...inputStyle, width: 160 }} defaultValue="22:00 – 07:00"/>}/>
            </Card>
          )}

          {section === 'devices' && (
            <Card title="Linked devices · 3 active">
              {[
                { name: 'iPhone 15 · Marco',     last: 'Now',           primary: true  },
                { name: 'iPad · Family',         last: '2 hours ago',   primary: false },
                { name: "Sofia's Pixel 8",       last: 'Yesterday',     primary: false },
              ].map((d, i) => (
                <SettingRow
                  key={i}
                  label={d.name}
                  desc={`Last active ${d.last}${d.primary ? ' · This device' : ''}`}
                  control={d.primary
                    ? <StatusPill tone="info">Current</StatusPill>
                    : <button style={{ ...btnGhost, color: TOKENS.coral, borderColor: TOKENS.coralSoft }}>Unlink</button>}
                />
              ))}
              <div style={{ marginTop: 14 }}>
                <button style={btnPrimary}><Icon name="plus" size={13}/> Pair new device with QR</button>
              </div>
            </Card>
          )}

          {section === 'ollama' && (
            <>
              <Card title="OllaBridge Cloud · Pairing for AI" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        fontFamily: 'Fraunces, serif', fontSize: 17,
                        color: TOKENS.ink, fontWeight: 500,
                      }}>Run MedOS AI on your own machine</span>
                      <StatusPill tone={bridge.paired ? 'good' : 'muted'}>● {bridge.paired ? 'Paired' : 'Not paired'}</StatusPill>
                    </div>
                    <div style={{ fontSize: 13, color: TOKENS.ink2, lineHeight: 1.55, marginBottom: 14 }}>
                      OllaBridge Cloud (ollabridge.com) securely connects MedOS Family to a local{' '}
                      <strong>Ollama</strong> instance running on your laptop or home server.
                      Your health questions and family data never leave your network — the cloud only
                      relays encrypted requests to your bridge.
                    </div>

                    <div style={{
                      background: TOKENS.surfaceMuted, border: `1px solid ${TOKENS.border}`,
                      borderRadius: 10, padding: 14, marginBottom: 14,
                    }}>
                      <div style={{
                        fontSize: 11, color: TOKENS.ink3, textTransform: 'uppercase',
                        letterSpacing: 0.7, fontWeight: 600, marginBottom: 8,
                      }}>Setup steps</div>
                      <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: TOKENS.ink2, lineHeight: 1.7 }}>
                        <li>Install <strong style={{ color: TOKENS.ink }}>Ollama</strong> from ollama.com on your computer</li>
                        <li>Run <code style={{
                          background: TOKENS.surface, padding: '1px 6px', borderRadius: 4,
                          fontFamily: 'ui-monospace, monospace', fontSize: 12,
                        }}>ollabridge --pair</code></li>
                        <li>Scan the QR shown by the bridge with this app</li>
                        <li>Choose your default model (Llama 3.1, Mistral, Med-PaLM…)</li>
                      </ol>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setBridge({ paired: !bridge.paired })} style={btnPrimary}>
                        <Icon name="syringe" size={13}/> {bridge.paired ? 'Re-pair bridge' : 'Pair OllaBridge Cloud'}
                      </button>
                      <button style={btnGhost}>Open documentation</button>
                    </div>
                  </div>

                  <div style={{
                    padding: 14, background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
                    borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}>
                    <QRPattern size={170}/>
                    <div style={{ fontSize: 11, color: TOKENS.ink3, textAlign: 'center' }}>
                      Bridge pair code<br/>
                      <strong style={{ color: TOKENS.ink2, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                        OB-7421-9056
                      </strong>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="AI assistant preferences">
                <SettingRow label="Local AI (via OllaBridge Cloud)" desc="Use your own Ollama instance — fastest privacy" control={<Toggle on={t('aiLocal')} onChange={setT('aiLocal')}/>}/>
                <SettingRow label="Cloud AI fallback"               desc="If bridge is offline, route to MedOS Cloud (encrypted)" control={<Toggle on={t('aiCloud')} onChange={setT('aiCloud')}/>}/>
                <SettingRow label="Default model" control={
                  <select style={{ ...inputStyle, width: 220 }} defaultValue="llama3.1">
                    <option value="llama3.1">Llama 3.1 8B (recommended)</option>
                    <option value="mistral">Mistral 7B</option>
                    <option value="medpalm">Med-PaLM 2 (cloud only)</option>
                    <option value="phi3">Phi-3 Mini</option>
                  </select>
                }/>
                <SettingRow label="Safety guardrails" desc="AI never prescribes, diagnoses, or changes dosages" control={<StatusPill tone="good">● Always on</StatusPill>}/>
                <SettingRow label="Conversation history" desc="Stored locally on your device only" control={<button style={btnGhost}>Clear history</button>}/>
              </Card>
            </>
          )}

          {section === 'help' && (
            <Card title="Help & support">
              <SettingRow label="Help center"      desc="Browse guides, FAQs, and tutorials" control={<button style={btnGhost}>Open</button>}/>
              <SettingRow label="Contact support"  desc="Average reply time: under 4 hours"   control={<button style={btnPrimary}><Icon name="bell" size={13}/> Message us</button>}/>
              <SettingRow label="Report a problem" control={<button style={btnGhost}>Report</button>}/>
              <SettingRow label="Send feedback"    desc="Help shape the next version of MedOS Family" control={<button style={btnGhost}>Send</button>}/>
              <SettingRow label="Community forum"  control={<button style={btnGhost}>Visit</button>}/>
              <SettingRow label="Status"           desc="All systems operational" control={<StatusPill tone="good">● Healthy</StatusPill>}/>
            </Card>
          )}

          {section === 'about' && (
            <Card title="About MedOS Family">
              <SettingRow label="Version"                       control={<span style={{ fontSize: 13, color: TOKENS.ink2 }}>1.0.0 (build 2026.05)</span>}/>
              <SettingRow label="Last sync"                     control={<span style={{ fontSize: 13, color: TOKENS.ink2 }}>Today, 8:45 AM</span>}/>
              <SettingRow label="Terms of service"              control={<button style={btnGhost}>View</button>}/>
              <SettingRow label="Privacy policy · GDPR"         control={<button style={btnGhost}>View</button>}/>
              <SettingRow label="HIPAA compliance statement"    control={<button style={btnGhost}>View</button>}/>
              <SettingRow label="Open-source licenses"          control={<button style={btnGhost}>View</button>}/>
              <div style={{
                marginTop: 14, padding: 12, background: TOKENS.surfaceMuted, borderRadius: 10,
                fontSize: 11, color: TOKENS.ink3, lineHeight: 1.6,
              }}>
                MedOS Family organizes your records. It does not diagnose, prescribe, or replace
                medical advice. Always consult your pediatrician for clinical decisions.
              </div>
            </Card>
          )}

          {section === 'logout' && (
            <Card title="Sign out">
              <div style={{ fontSize: 13, color: TOKENS.ink2, lineHeight: 1.55, marginBottom: 16 }}>
                You&apos;re about to sign out of MedOS Family on this device. Your encrypted data
                stays safe and will sync back the next time you sign in.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnPrimary, background: TOKENS.coral }}>
                  <Icon name="skip" size={13}/> Sign out
                </button>
                <button style={btnGhost}>Cancel</button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TOKENS } from '../../lib/tokens';
import { btnGhost, btnPrimary, inputStyle } from '../../lib/styles';
import { Icon, type IconName } from '../Icon';
import { QRPattern } from './QRPattern';

type Method = 'manual' | 'sync' | 'invite' | null;
type SyncSubmethod = 'qr' | 'code' | 'email';

interface Props { onClose: () => void }

export function AddMemberWizard({ onClose }: Props) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method>(null);
  const [syncSubmethod, setSyncSubmethod] = useState<SyncSubmethod>('qr');
  const [pairCode] = useState('428-913-602');
  const [form, setForm] = useState({ relation: 'child', name: '', dob: '', sex: '' });

  const totalSteps = 3;
  const stepLabels = method === 'manual'
    ? ['Choose method', 'Member details', 'Permissions']
    : method === 'sync'
      ? ['Choose method', 'Pair device', 'Confirm']
      : ['Choose method', 'Invite', 'Confirm'];

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: TOKENS.surface, borderRadius: 18, width: '100%', maxWidth: 760,
        maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
        border: `1px solid ${TOKENS.border}`, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 28px 18px', borderBottom: `1px solid ${TOKENS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: 11, color: TOKENS.primaryInk, textTransform: 'uppercase',
                letterSpacing: 0.8, fontWeight: 600,
              }}>Step {step} of {totalSteps}</div>
              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 22, color: TOKENS.ink,
                fontWeight: 500, marginTop: 4,
              }}>Add a family member</div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 99, border: `1px solid ${TOKENS.border}`,
              background: TOKENS.surface, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: TOKENS.ink2, fontSize: 16,
            }}>✕</button>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {stepLabels.map((lbl, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{
                  height: 4, borderRadius: 99,
                  background: i + 1 <= step ? TOKENS.primary : TOKENS.border,
                  transition: 'background 0.2s',
                }}/>
                <div style={{
                  fontSize: 11, color: i + 1 === step ? TOKENS.ink : TOKENS.ink3,
                  marginTop: 6, fontWeight: i + 1 === step ? 600 : 400,
                }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflow: 'auto', flex: 1 }}>
          {step === 1 && (
            <Step1
              method={method}
              setMethod={setMethod}
            />
          )}

          {step === 2 && method === 'manual' && (
            <Step2Manual form={form} setForm={setForm}/>
          )}

          {step === 2 && method === 'sync' && (
            <Step2Sync
              syncSubmethod={syncSubmethod}
              setSyncSubmethod={setSyncSubmethod}
              pairCode={pairCode}
            />
          )}

          {step === 2 && method === 'invite' && (
            <Step2Invite/>
          )}

          {step === 3 && (
            <Step3Permissions method={method}/>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px', borderTop: `1px solid ${TOKENS.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: TOKENS.surfaceMuted,
        }}>
          <button onClick={step === 1 ? onClose : back} style={btnGhost}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step < totalSteps ? (
              <button
                onClick={next}
                disabled={step === 1 && !method}
                style={{
                  ...btnPrimary,
                  opacity: step === 1 && !method ? 0.5 : 1,
                  cursor: step === 1 && !method ? 'not-allowed' : 'pointer',
                }}
              >
                Continue →
              </button>
            ) : (
              <button onClick={onClose} style={btnPrimary}>
                <Icon name="plus" size={13}/>{' '}
                {method === 'invite' ? 'Send invite' : method === 'sync' ? 'Finish pairing' : 'Add member'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Step 1: choose method ──────────────────────────────────────────────

function Step1({ method, setMethod }: { method: Method; setMethod: (m: Method) => void }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: TOKENS.ink2, marginBottom: 16, lineHeight: 1.55 }}>
        How would you like to add this person? Sync with another MedOS account to share records securely,
        or add them manually.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <WizardOption
          icon="kids"
          title="Add manually"
          badge="No account needed"
          desc="Create a new profile yourself. Best for young children or anyone without a MedOS account."
          selected={method === 'manual'}
          onClick={() => setMethod('manual')}
        />
        <WizardOption
          icon="syringe"
          title="Sync with another MedOS account"
          badge="End-to-end encrypted"
          desc="Link an existing MedOS user (adult, child, or guardian-managed). Shared records stay in sync across devices."
          selected={method === 'sync'}
          onClick={() => setMethod('sync')}
        />
        <WizardOption
          icon="bell"
          title="Invite by email"
          desc="Send an invitation. They'll create their own MedOS account and choose what to share with the family."
          selected={method === 'invite'}
          onClick={() => setMethod('invite')}
        />
      </div>
      <div style={{
        marginTop: 18, padding: 14, background: TOKENS.surfaceMuted, borderRadius: 10,
        border: `1px solid ${TOKENS.border}`, display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Icon name="alert" size={16} color={TOKENS.amber}/>
        <div style={{ fontSize: 12, color: TOKENS.ink2, lineHeight: 1.5 }}>
          <strong style={{ color: TOKENS.ink }}>Privacy:</strong> shared records use end-to-end
          encryption. The new member can revoke access at any time from their own MedOS settings.
          Guardian-managed profiles auto-transfer to self-managed at age 18.
        </div>
      </div>
    </div>
  );
}

interface WizardOptionProps {
  icon: IconName;
  title: string;
  desc: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}

function WizardOption({ icon, title, desc, badge, selected, onClick }: WizardOptionProps) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: 'pointer', width: '100%',
      background: selected ? TOKENS.primarySoft : TOKENS.surface,
      border: `2px solid ${selected ? TOKENS.primary : TOKENS.border}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
      transition: 'all 0.15s ease', font: 'inherit', color: 'inherit',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: selected ? TOKENS.primary : TOKENS.surfaceMuted,
        color: selected ? '#fff' : TOKENS.primary,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><Icon name={icon} size={18}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink }}>{title}</div>
          {badge && (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 99,
              background: TOKENS.goodSoft, color: '#3d6a42', fontWeight: 600,
            }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: TOKENS.ink2, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </button>
  );
}

// ───── Field helper ───────────────────────────────────────────────────────

function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontSize: 11, color: TOKENS.ink3, textTransform: 'uppercase',
        letterSpacing: 0.7, fontWeight: 600, marginBottom: 6,
      }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: TOKENS.ink3, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

// ───── Step 2: manual ─────────────────────────────────────────────────────

interface FormState { relation: string; name: string; dob: string; sex: string }

function Step2Manual({
  form, setForm,
}: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Relationship">
          <select style={inputStyle} value={form.relation}
            onChange={(e) => setForm({ ...form, relation: e.target.value })}>
            <option value="child">Child</option>
            <option value="spouse">Spouse / Partner</option>
            <option value="parent">Parent / Grandparent</option>
            <option value="guardian">Guardian-managed</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Sex">
          <select style={inputStyle} value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Field label="Full name">
          <input
            style={inputStyle} type="text" placeholder="e.g. Giulia Romano"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Date of birth">
          <input
            style={inputStyle} type="date"
            value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />
        </Field>
        <Field label="Blood group" hint="Optional — can be added later">
          <select style={inputStyle} defaultValue="">
            <option value="">Unknown</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Allergies & notes" hint="You can add medical history later from the profile.">
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="e.g. Peanuts (mild)"
        />
      </Field>
    </div>
  );
}

// ───── Step 2: sync ───────────────────────────────────────────────────────

function Step2Sync({
  syncSubmethod, setSyncSubmethod, pairCode,
}: { syncSubmethod: SyncSubmethod; setSyncSubmethod: (s: SyncSubmethod) => void; pairCode: string }) {
  return (
    <div>
      <div style={{
        display: 'flex', gap: 6, padding: 4, background: TOKENS.surfaceMuted,
        borderRadius: 10, marginBottom: 18,
      }}>
        {([
          { id: 'qr',    label: 'QR code'      },
          { id: 'code',  label: 'Pair code'    },
          { id: 'email', label: 'MedOS email'  },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setSyncSubmethod(t.id)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: syncSubmethod === t.id ? TOKENS.surface : 'transparent',
            color: syncSubmethod === t.id ? TOKENS.ink : TOKENS.ink2,
            fontSize: 12, fontWeight: 600, font: 'inherit',
            boxShadow: syncSubmethod === t.id ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>{t.label}</button>
        ))}
      </div>

      {syncSubmethod === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
          <div style={{
            padding: 14, background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
            borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <QRPattern size={180}/>
            <div style={{ fontSize: 11, color: TOKENS.ink3, textAlign: 'center' }}>
              Expires in <strong style={{ color: TOKENS.ink2 }}>04:58</strong>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: TOKENS.ink, marginBottom: 8 }}>
              Scan from another device
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: TOKENS.ink2, lineHeight: 1.7 }}>
              <li>Open <strong style={{ color: TOKENS.ink }}>MedOS</strong> on the other person&apos;s phone or tablet</li>
              <li>Go to <strong style={{ color: TOKENS.ink }}>Settings → Linked devices → Add to family</strong></li>
              <li>Point their camera at this QR code</li>
              <li>Confirm the pairing on both devices</li>
            </ol>
            <div style={{
              marginTop: 14, padding: 10, background: TOKENS.goodSoft, borderRadius: 8,
              fontSize: 12, color: '#3d6a42',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <Icon name="heart" size={14}/> End-to-end encrypted · QR rotates every 5 min
            </div>
          </div>
        </div>
      )}

      {syncSubmethod === 'code' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 13, color: TOKENS.ink2, marginBottom: 16 }}>
            Share this 9-digit pair code with the other MedOS user.
          </div>
          <div style={{
            display: 'inline-block', padding: '20px 32px', background: TOKENS.surfaceMuted,
            border: `2px dashed ${TOKENS.primary}`, borderRadius: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 32, letterSpacing: 4, color: TOKENS.ink, fontWeight: 600,
          }}>{pairCode}</div>
          <div style={{ fontSize: 12, color: TOKENS.ink3, marginTop: 14 }}>
            Code expires in 10 minutes · They enter it under <strong>Settings → Join family</strong>
          </div>
          <button style={{ ...btnGhost, marginTop: 14 }}>
            <Icon name="doc" size={13}/> Copy code
          </button>
        </div>
      )}

      {syncSubmethod === 'email' && (
        <div>
          <Field label="Their MedOS account email" hint="They'll get a push notification to confirm. No email is sent.">
            <input style={inputStyle} type="email" placeholder="name@example.com"/>
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Relationship">
              <select style={inputStyle} defaultValue="spouse">
                <option value="spouse">Spouse / Partner</option>
                <option value="child">Child (with own account)</option>
                <option value="parent">Parent / Grandparent</option>
                <option value="other">Other family</option>
              </select>
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Step 2: invite ─────────────────────────────────────────────────────

function Step2Invite() {
  return (
    <div>
      <Field label="Email address">
        <input style={inputStyle} type="email" placeholder="they-dont-have-medos@example.com"/>
      </Field>
      <div style={{ marginTop: 14 }}>
        <Field label="Personal message (optional)">
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            defaultValue="Hi! I'm using MedOS Family to organize our health records. Join my family so we can share schedules and reminders."
          />
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Their role in the family">
          <select style={inputStyle} defaultValue="adult">
            <option value="adult">Adult member</option>
            <option value="teen">Teen (13–17, manages own profile)</option>
            <option value="guardian">Co-guardian (can manage children)</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

// ───── Step 3: permissions ────────────────────────────────────────────────

function Step3Permissions({ method }: { method: Method }) {
  const perms = [
    { k: 'view',   label: 'View shared family records',           desc: 'Vaccines, medicines, alerts for shared profiles', def: true                    },
    { k: 'edit',   label: 'Add and edit records',                 desc: 'Log doses, add notes, mark vaccines',             def: method !== 'invite'      },
    { k: 'manage', label: 'Manage children profiles',             desc: 'Co-guardian access — only for adults',            def: method === 'sync'        },
    { k: 'export', label: 'Export pediatrician summaries',        desc: 'Generate PDF summaries for doctors',              def: true                    },
    { k: 'notify', label: 'Receive family-wide notifications',    desc: 'Outbreak alerts, weekly summaries, reminders',    def: true                    },
  ];

  return (
    <div>
      <div style={{ fontSize: 13, color: TOKENS.ink2, marginBottom: 16, lineHeight: 1.55 }}>
        Choose what this member can see and do. They can change these later from their own MedOS settings.
      </div>
      {perms.map((p) => (
        <label key={p.k} style={{
          display: 'flex', gap: 12, padding: 12, marginBottom: 8,
          background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10,
          cursor: 'pointer',
        }}>
          <input type="checkbox" defaultChecked={p.def} style={{ marginTop: 3, accentColor: TOKENS.primary }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink }}>{p.label}</div>
            <div style={{ fontSize: 12, color: TOKENS.ink2, marginTop: 2 }}>{p.desc}</div>
          </div>
        </label>
      ))}
      <div style={{
        marginTop: 14, padding: 12, background: TOKENS.primarySoft, borderRadius: 10,
        fontSize: 12, color: TOKENS.primaryInk,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Icon name="heart" size={14}/>
        <div>
          By adding a member you agree to the <strong>Family data sharing terms</strong>.
          MedOS never shares family data with third parties.
        </div>
      </div>
    </div>
  );
}

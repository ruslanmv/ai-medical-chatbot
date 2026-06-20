import { describe, it, expect, afterEach } from 'vitest';
import { symptomCardsEnabled } from '@/lib/feature-flags';
import { preCheck } from '@/lib/safety/safety-engine';

// The deterministic symptom-flow cards are gated OFF by default so symptom
// turns get a natural LLM reply instead of a robotic checklist. This locks
// in (a) the default, and (b) that disabling the cards does NOT weaken the
// emergency safety floor — preCheck() still escalates red-flags on raw text.

describe('symptom-flow cards flag', () => {
  afterEach(() => {
    delete process.env.MEDOS_SYMPTOM_CARDS_ENABLED;
  });

  it('is OFF by default — symptom turns fall through to the LLM', () => {
    delete process.env.MEDOS_SYMPTOM_CARDS_ENABLED;
    expect(symptomCardsEnabled()).toBe(false);
  });

  it('can be re-enabled via env (A/B / clinician pilot)', () => {
    process.env.MEDOS_SYMPTOM_CARDS_ENABLED = 'true';
    expect(symptomCardsEnabled()).toBe(true);
  });
});

describe('safety floor is independent of the symptom cards', () => {
  it('still escalates a red-flag emergency to the emergency template (R5)', () => {
    const d = preCheck({
      text: 'severe chest pain radiating to my left arm',
      countryCode: 'US',
    });
    expect(d.kind).toBe('emergency_template');
    expect(d.riskClass).toBe('R5');
  });

  it('lets an ordinary symptom proceed to the LLM (allow_llm, not a card)', () => {
    const d = preCheck({
      text: 'I have a mild headache after drinking wine last night',
      countryCode: 'US',
    });
    expect(d.kind).toBe('allow_llm');
  });
});

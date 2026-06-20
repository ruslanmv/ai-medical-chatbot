import { describe, it, expect } from 'vitest';
import { classifyIntent } from '@/lib/medical-flow/intent';
import { nextSymptomCard } from '@/lib/medical-flow/state';

const FIRST_TURN = { prior_user_turns: 0, is_emergency: false };

// ---------------------------------------------------------------------------
// Regression: a greeting ("Hello") must never open a symptom-triage card.
//
// The bug: classifyIntent correctly tags greetings as `chitchat`, but the
// chat route only honoured that on turn 1. On later turns "Hello" fell
// through to the symptom state machine, which re-matched a complaint from
// history and opened a chest-pain intake card. The route now short-circuits
// chitchat on EVERY turn, so the first thing to lock down is that greetings
// stay classified as chitchat regardless of how far into the chat we are.
// ---------------------------------------------------------------------------
describe('greeting routing (Hello bug regression)', () => {
  it('tags a plain greeting as chitchat on the first turn', () => {
    expect(classifyIntent('Hello', FIRST_TURN)).toBe('chitchat');
    expect(classifyIntent('hi there', FIRST_TURN)).toBe('chitchat');
    expect(classifyIntent('hey', FIRST_TURN)).toBe('chitchat');
  });

  it('STILL tags a greeting as chitchat after a medical conversation', () => {
    // The exact bug scenario: several prior turns, then "Hello". It must
    // remain chitchat so the route replies conversationally instead of
    // reopening a triage flow.
    expect(
      classifyIntent('Hello', { prior_user_turns: 3, is_emergency: false }),
    ).toBe('chitchat');
  });

  it('does NOT treat a real complaint as chitchat', () => {
    expect(classifyIntent('I have chest pain', FIRST_TURN)).not.toBe('chitchat');
    expect(
      classifyIntent('my head has hurt for three days', FIRST_TURN),
    ).not.toBe('chitchat');
  });
});

// ---------------------------------------------------------------------------
// The consultation flow itself stays trustworthy: a genuine symptom opens
// the safety_check (red-flag) card, and stale complaints are not resurrected
// by later off-topic messages when no flow card is active.
// ---------------------------------------------------------------------------
describe('symptom triage flow', () => {
  it('opens a safety_check (red-flag) card for a real symptom', () => {
    const res = nextSymptomCard([], 'I have chest pain');
    expect(res).not.toBeNull();
    expect(res!.card.kind).toBe('safety_check');
  });

  it('does not resurrect a past complaint from an off-topic message when not mid-flow', () => {
    // Chest pain was mentioned earlier, but the last assistant message is
    // plain text (no active safety_check / intake card). An unrelated
    // follow-up must NOT reopen the chest-pain triage.
    const history = [
      { role: 'user', content: 'I have chest pain' },
      { role: 'assistant', content: 'Thanks — is there anything else on your mind?' },
    ];
    expect(nextSymptomCard(history, 'what time is it')).toBeNull();
  });
});

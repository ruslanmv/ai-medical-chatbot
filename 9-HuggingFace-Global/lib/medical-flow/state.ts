/**
 * Stateless flow-state derivation.
 *
 * The chat route holds no per-conversation state — every turn it
 * receives the full message history and decides what to emit next.
 * This function reads the history and decides "where is the user in
 * the multi-turn symptom flow?" so we can deterministically pick the
 * right card without persisting anything.
 *
 * Approach: walk the message history backward looking for the most
 * recent assistant turn that contained a `[card:safety_check]` or
 * `[card:intake]` marker. That tells us which step the user just
 * answered. Combined with the *current* user message (which carries
 * the answer as a `selected:` / `rf:` / `slider:` token), we know
 * what step is next.
 */

import type {
  Card,
  IntakeCard,
  SafetyCheckCard,
  GuidanceCard,
  DoctorSummaryCard,
  NextStepsCard,
} from './types';
import {
  findSymptomFlow,
  hasRedFlag,
  type SymptomFlow,
} from './symptoms';
import { buildIntakeCard, buildNextStepsCard } from './cards';
import {
  buildSymptomGuidance,
  buildSymptomDoctorSummary,
  buildSymptomNextSteps,
} from './guidance';

interface FlowState {
  /** The symptom flow currently in progress (if any). */
  flow: SymptomFlow;
  /** Index of the LAST intake step the user just answered. -1 means
   *  they just answered the safety check (so step 0 is next). */
  last_intake_step: number;
  /** Was a red flag selected on the safety check? */
  has_red_flag: boolean;
  /** Aggregated answers collected so far — used by Batch 3's guidance
   *  card builder. */
  answers: { location?: string; duration?: string; severity?: number };
}

/** Pull the kind of the most recent card the assistant emitted, plus
 *  the surrounding context. Returns null if no prior card found. */
function lastAssistantCardKind(
  messages: Array<{ role: string; content: string }>,
): { kind: Card['kind']; flowId?: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    const match = m.content.match(/\[card:([a-z_]+)\]\s*([\s\S]*?)\s*\[\/card\]/i);
    if (!match) continue;
    const kind = match[1] as Card['kind'];
    try {
      const card = JSON.parse(match[2]);
      return { kind, flowId: card.title?.toLowerCase().replace(/\s+/g, '-') };
    } catch {
      return { kind };
    }
  }
  return null;
}

/** Walk history collecting user answers tagged with the per-symptom
 *  selection tokens. */
function collectAnswers(
  messages: Array<{ role: string; content: string }>,
): FlowState['answers'] & { red_flags_selected: string[] } {
  const answers: FlowState['answers'] & { red_flags_selected: string[] } = {
    red_flags_selected: [],
  };
  for (const m of messages) {
    if (m.role !== 'user') continue;
    const text = m.content;
    const loc = text.match(/selected:loc:([a-z]+)/i);
    if (loc) answers.location = loc[1].toLowerCase();
    const dur = text.match(/selected:duration:([0-9a-z-]+)/i);
    if (dur) answers.duration = dur[1];
    const sev = text.match(/slider:(\d{1,2})/i);
    if (sev) answers.severity = parseInt(sev[1], 10);
    const rfs = text.match(/rf:[a-z]+:[a-z_]+/gi);
    if (rfs) answers.red_flags_selected.push(...rfs);
  }
  return answers;
}

/**
 * Decide what symptom-flow card (if any) to emit for the current turn.
 *
 * Returns null when:
 *   - the user's message doesn't trigger any symptom flow AND there is
 *     no active flow in the conversation history (let the bubble flow
 *     handle it)
 *   - the user just answered the last intake step (fall through to the
 *     guidance card or the existing bubble flow)
 *
 * Returns a `SafetyCheckCard` when the user just opened a symptom.
 * Returns an `IntakeCard` when they're partway through a flow.
 */
export function nextSymptomCard(
  history: Array<{ role: string; content: string }>,
  currentUserText: string,
):
  | {
      card: SafetyCheckCard | IntakeCard | GuidanceCard | DoctorSummaryCard | NextStepsCard;
      /** When multiple cards should be emitted back-to-back (guidance +
       *  next_steps), populate `extra` with the additional cards. */
      extra?: Card[];
      flow: SymptomFlow;
      answers: FlowState['answers'];
    }
  | null {
  // Walk-back: find the most recent in-flow assistant card, if any.
  const lastCard = lastAssistantCardKind(history);
  const flow = findSymptomFlow(currentUserText) || findSymptomFlow(
    // If the current turn is a token like "selected:loc:lower", the
    // user's free-text from earlier in the conversation determines
    // which flow we're in. Fall back to scanning earlier user turns.
    history
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' '),
  );
  if (!flow) return null;

  const answers = collectAnswers([...history, { role: 'user', content: currentUserText }]);

  // Case A: brand-new symptom mention. No prior in-flow card yet.
  if (!lastCard || (lastCard.kind !== 'safety_check' && lastCard.kind !== 'intake')) {
    return { card: flow.safety, flow, answers };
  }

  // Case B: user just answered the safety check.
  if (lastCard.kind === 'safety_check') {
    // Red flag selected → emit guidance card directly with the
    // appropriate care_level (urgent / emergency per flow). Skip
    // intake entirely — the user needs care now, not more questions.
    const hasFlag =
      hasRedFlag(currentUserText) || /\brf:back|rf:hd|rf:abd/.test(currentUserText);
    if (hasFlag) {
      const guidance = buildSymptomGuidance(flow, answers);
      if (guidance) {
        const nextSteps = buildNextStepsCard({
          title: 'Next steps',
          actions: buildSymptomNextSteps(),
        });
        return { card: guidance, extra: [nextSteps], flow, answers };
      }
      return null;
    }
    // Safe answer → next intake step (index 0).
    if (flow.intake_steps.length > 0) {
      const step = flow.intake_steps[0];
      return {
        card: buildIntakeCard({
          ...step,
          progress: 1 / (flow.intake_steps.length + 1),
        }),
        flow,
        answers,
      };
    }
    return null;
  }

  // Case C: user just answered an intake step. Figure out which one
  // by counting how many intake cards have been emitted so far.
  const intakeEmitted = history.filter(
    (m) =>
      m.role === 'assistant' &&
      m.content.includes('[card:intake]'),
  ).length;
  const nextIndex = intakeEmitted; // we want the (intakeEmitted)-th step (0-based)
  if (nextIndex < flow.intake_steps.length) {
    const step = flow.intake_steps[nextIndex];
    return {
      card: buildIntakeCard({
        ...step,
        progress: (nextIndex + 1) / (flow.intake_steps.length + 1),
      }),
      flow,
      answers,
    };
  }

  // All intake steps done → emit guidance + next_steps cards.
  // The user has answered every prompt for this flow; produce the
  // deterministic recommendation and a row of next-step actions.
  const guidance = buildSymptomGuidance(flow, answers);
  if (guidance) {
    const nextSteps = buildNextStepsCard({
      title: 'Next steps',
      summary: `Based on your answers for ${flow.safety.title.toLowerCase()}.`,
      actions: buildSymptomNextSteps(),
    });
    return { card: guidance, extra: [nextSteps], flow, answers };
  }
  return null;
}

/** Generate the doctor-summary card from the full conversation. Called
 *  when the user clicks "Create doctor summary" from the next_steps
 *  card. Returns null when there's no active symptom flow or guidance
 *  was never emitted. */
export function generateDoctorSummary(
  history: Array<{ role: string; content: string }>,
): DoctorSummaryCard | null {
  // Find the most recent symptom flow + guidance in the conversation.
  let activeFlow: SymptomFlow | null = null;
  for (const m of history) {
    if (m.role !== 'user') continue;
    const f = findSymptomFlow(m.content);
    if (f) activeFlow = f;
  }
  if (!activeFlow) return null;
  const answers = collectAnswers(history);
  const guidance = buildSymptomGuidance(activeFlow, answers);
  if (!guidance) return null;
  return buildSymptomDoctorSummary(activeFlow, answers, guidance);
}

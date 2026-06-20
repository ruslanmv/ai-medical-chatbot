/**
 * Post-generation faithfulness check (Phase 2).
 *
 * A lightweight LLM-judge verifies that the answer's clinical claims are
 * entailed by the retrieved SOURCES. It returns a 0–1 groundedness score
 * and any unsupported claims. It is FAIL-OPEN: any judge/parse error
 * returns `ok` with a null score so a transient judge failure never blocks
 * a safe answer (the deterministic safety floor is unaffected either way).
 *
 * Gated by risk class so chit-chat / low-risk turns skip the extra call.
 */

import { chatWithFallback, type ChatMessage } from '../providers';
import { faithfulnessEnabled, faithfulnessMinRisk } from '../feature-flags';
import { parseJudge } from './judge-parse';
import type { RetrievedChunk } from './types';

const ORDER = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];

function rank(rc: string): number {
  const i = ORDER.indexOf((rc || 'R0').toUpperCase());
  return i < 0 ? 0 : i;
}

/** Whether the faithfulness check should run for this turn. */
export function shouldCheckFaithfulness(riskClass: string): boolean {
  return faithfulnessEnabled() && rank(riskClass) >= rank(faithfulnessMinRisk());
}

export interface FaithfulnessResult {
  /** 0–1, or null when the check did not run / could not be parsed. */
  groundedness: number | null;
  unsupported: string[];
  ok: boolean;
}

const PASS: FaithfulnessResult = { groundedness: null, unsupported: [], ok: true };

export async function checkFaithfulness(
  answer: string,
  chunks: RetrievedChunk[],
): Promise<FaithfulnessResult> {
  if (!answer.trim() || chunks.length === 0) return PASS;

  const sources = chunks
    .map((c, i) => `[S${i + 1}] ${c.organization} — ${c.doc_title}\n${c.text}`)
    .join('\n\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a strict medical fact-checker. Given SOURCES and an ANSWER, ' +
        'judge how well the ANSWER\'s clinical claims are supported by the ' +
        'SOURCES. Reply with ONLY compact JSON: ' +
        '{"groundedness": <0..1>, "unsupported_claims": ["..."]}. ' +
        'groundedness is the fraction of clinical claims directly supported ' +
        'by the SOURCES. Ignore empathy/structure/safety boilerplate.',
    },
    {
      role: 'user',
      content: `SOURCES:\n${sources}\n\nANSWER:\n${answer}\n\nJSON:`,
    },
  ];

  try {
    const res = await chatWithFallback(messages);
    const parsed = parseJudge(res.content);
    if (!parsed) return PASS;
    return {
      groundedness: parsed.groundedness,
      unsupported: parsed.unsupported,
      ok: true,
    };
  } catch (e) {
    console.warn(`[rag.faithfulness] judge failed: ${(e as Error).message}`);
    return PASS;
  }
}

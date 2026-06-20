/**
 * Turn retrieved chunks into (a) a prompt-ready, source-labelled context
 * block, (b) the grounding instruction appended to the system prompt, and
 * (c) the deterministic "insufficient evidence" deferral.
 *
 * The labels [S1], [S2]… are stable within a turn so the model can cite
 * them and the UI can map a citation back to a real source/url.
 */

import type { RetrievedChunk, EvidenceSource } from './types';

/**
 * System-prompt addendum used ONLY when grounded evidence is present.
 * It overrides the KB's softer "use your general training too" wording:
 * for clinical claims the model must stay inside the retrieved sources.
 */
export const GROUNDED_INSTRUCTION = `# Evidence grounding (authoritative)
You have been given numbered SOURCES retrieved from a versioned medical
knowledge base. For any clinical claim (causes, risks, management,
medications, thresholds, when to seek care):
- Use ONLY the information supported by the SOURCES below.
- Cite the source inline as [S1], [S2], … immediately after the claim it supports.
- If the SOURCES do not cover what was asked, say so plainly and recommend
  the user consult a licensed clinician — do NOT fill the gap from memory.
- You may still use general language for empathy, structure, and safety
  guidance, but every medical fact must trace to a cited source.`;

export function buildGroundedContext(chunks: RetrievedChunk[]): {
  contextText: string;
  sources: EvidenceSource[];
} {
  const sources: EvidenceSource[] = chunks.map((c, i) => ({
    ref: `S${i + 1}`,
    title: c.doc_title,
    organization: c.organization,
    url: c.url,
    version_date: c.version_date,
    chunk_id: c.chunk_id,
    score: c.score,
  }));

  const blocks = chunks.map((c, i) => {
    const date = c.version_date ? `, ${c.version_date}` : '';
    return `[S${i + 1}] ${c.organization} — "${c.doc_title}"${date}\n${c.text}`;
  });

  const contextText =
    `\n\n# SOURCES (retrieved medical knowledge — cite as [S1], [S2], …)\n` +
    blocks.join('\n\n');

  return { contextText, sources };
}

/**
 * Deterministic deferral when RAG_REQUIRE_EVIDENCE is on and retrieval
 * found nothing relevant. Honest "I don't have verified information"
 * instead of an unguarded model guess. The emergency number is woven in
 * so the user always has a safe next step.
 */
export function insufficientEvidenceReply(emergencyNumber: string): string {
  return (
    `I don't have **verified information** from my medical knowledge base ` +
    `to answer that safely right now, so I'd rather not guess.\n\n` +
    `Please consult a licensed healthcare professional, who can assess your ` +
    `specific situation. If this is or becomes an emergency — for example ` +
    `severe or worsening symptoms — contact your local emergency services ` +
    `(${emergencyNumber}) immediately.\n\n` +
    `_This assistant only provides answers it can ground in trusted medical sources._`
  );
}

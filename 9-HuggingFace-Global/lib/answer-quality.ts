/**
 * Lightweight heuristics for showing trust signals on AI answers without
 * making any extra model calls.
 *
 *  1. `estimateConfidence(text)` — classifies a response as low / medium /
 *     high based on hedge-word density vs. structured-section density.
 *  2. `extractCitations(text)` — finds references to authoritative
 *     medical bodies (WHO, CDC, NHS, NIH, ICD, EMA, Mayo, Cochrane) and
 *     returns them as clickable chip descriptors pointing at each body's
 *     official patient-facing landing page.
 *
 * Kept pure / dependency-free so it's easy to unit-test and runs on both
 * server and client.
 */

export type Confidence = 'low' | 'medium' | 'high';

const HEDGE_WORDS = [
  'might', 'may', 'could', 'possibly', 'possible', 'uncertain',
  "it's hard to say", 'hard to say', 'unclear', 'perhaps', 'seems',
  "i'm not sure", 'not sure', 'difficult to say',
];

/**
 * Look for the structured section markers from the medical-knowledge
 * output contract (**Summary**, **What it could be**, etc). Their
 * presence is a strong signal that the model followed the contract —
 * we lift confidence accordingly.
 */
const STRUCTURE_MARKERS = [
  '**summary**',
  '**what it could be**',
  '**self-care**',
  '**when to seek care**',
  '**red flags**',
];

export function estimateConfidence(text: string): Confidence {
  if (!text || text.length < 40) return 'low';
  const lower = text.toLowerCase();

  let hedges = 0;
  for (const h of HEDGE_WORDS) {
    // count occurrences (bounded to avoid quadratic on huge inputs)
    let idx = lower.indexOf(h);
    while (idx !== -1 && hedges < 10) {
      hedges++;
      idx = lower.indexOf(h, idx + h.length);
    }
  }

  let sections = 0;
  for (const m of STRUCTURE_MARKERS) {
    if (lower.includes(m)) sections++;
  }

  // Rules of thumb: full structure + few hedges = high; lots of hedges
  // and no structure = low; everything else = medium.
  if (sections >= 3 && hedges <= 3) return 'high';
  if (sections === 0 && hedges >= 4) return 'low';
  return 'medium';
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: 'Exploratory',
  medium: 'Guidance',
  high: 'Aligned with guidelines',
};

export const CONFIDENCE_COLORS: Record<Confidence, string> = {
  low: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  medium: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  high: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
};

// ---------------------------------------------------------------------

export interface Citation {
  id: string;
  label: string;
  url: string;
}

/**
 * Each citation body gets a stable label + a public patient-facing URL.
 * Matching is case-insensitive and tolerant of punctuation.
 */
const CITATION_PATTERNS: Array<{ id: string; re: RegExp; label: string; url: string }> = [
  { id: 'who',     re: /\bWHO\b|World Health Organization/i, label: 'WHO',      url: 'https://www.who.int/health-topics' },
  { id: 'cdc',     re: /\bCDC\b|Centers for Disease Control/i, label: 'CDC',    url: 'https://www.cdc.gov/health-topics.html' },
  { id: 'nhs',     re: /\bNHS\b|National Health Service/i,     label: 'NHS',    url: 'https://www.nhs.uk/conditions/' },
  { id: 'nih',     re: /\bNIH\b|MedlinePlus|National Institutes of Health/i, label: 'NIH / MedlinePlus', url: 'https://medlineplus.gov/' },
  { id: 'icd',     re: /\bICD-?(10|11)\b/i,                     label: 'ICD-11',url: 'https://icd.who.int/' },
  { id: 'bnf',     re: /\bBNF\b|British National Formulary/i,  label: 'BNF',    url: 'https://bnf.nice.org.uk/' },
  { id: 'ema',     re: /\bEMA\b|European Medicines Agency/i,   label: 'EMA',    url: 'https://www.ema.europa.eu/en/medicines' },
  { id: 'mayo',    re: /Mayo Clinic/i,                          label: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions' },
  { id: 'cochrane',re: /Cochrane/i,                             label: 'Cochrane',    url: 'https://www.cochranelibrary.com/' },
];

export function extractCitations(text: string): Citation[] {
  if (!text) return [];
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const p of CITATION_PATTERNS) {
    if (p.re.test(text) && !seen.has(p.id)) {
      seen.add(p.id);
      out.push({ id: p.id, label: p.label, url: p.url });
    }
  }
  return out;
}

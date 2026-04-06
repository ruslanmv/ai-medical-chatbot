/**
 * Contextual follow-up suggestions derived from an AI answer.
 *
 * We deliberately keep this keyword-based rather than using another LLM
 * call: deterministic, free, instant, and safe. The function scans the
 * latest assistant message for medical signal words and picks 3–4
 * follow-ups from a curated map. Falls back to a universal default set
 * when nothing matches.
 *
 * The suggestions are short, universally useful next questions, and
 * will themselves be answered by the model in the user's language.
 */

export type FollowUp = { id: string; prompt: string };

const DEFAULTS: FollowUp[] = [
  { id: 'more',     prompt: 'Tell me more' },
  { id: 'causes',   prompt: 'What causes this?' },
  { id: 'doctor',   prompt: 'Should I see a doctor?' },
  { id: 'prevent',  prompt: 'How can I prevent it?' },
];

/**
 * Topic → prompts map. Each topic is a set of lowercase keywords and the
 * follow-ups we want to surface when any of them appear in the answer.
 */
const TOPICS: Array<{ keywords: string[]; prompts: FollowUp[] }> = [
  {
    keywords: ['fever', 'temperature', '°c', '°f', 'chills'],
    prompts: [
      { id: 'fever.when',   prompt: 'When is a fever dangerous?' },
      { id: 'fever.reduce', prompt: 'How do I safely bring down a fever?' },
      { id: 'fever.kids',   prompt: 'Is this fever safe for my child?' },
    ],
  },
  {
    keywords: ['pain', 'ache', 'hurts', 'sore'],
    prompts: [
      { id: 'pain.relief',    prompt: 'What safe pain relief can I take?' },
      { id: 'pain.worsens',   prompt: 'When should I worry about this pain?' },
      { id: 'pain.duration',  prompt: 'How long should this last?' },
    ],
  },
  {
    keywords: ['headache', 'migraine', 'head'],
    prompts: [
      { id: 'head.types',   prompt: 'What type of headache is this?' },
      { id: 'head.triggers',prompt: 'What triggers headaches?' },
      { id: 'head.relief',  prompt: 'Natural ways to relieve a headache' },
    ],
  },
  {
    keywords: ['cough', 'bronchitis', 'phlegm', 'mucus', 'sore throat'],
    prompts: [
      { id: 'cough.types',  prompt: 'Is this a dry or wet cough?' },
      { id: 'cough.relief', prompt: 'Home remedies that actually work' },
      { id: 'cough.worry',  prompt: 'When should a cough be checked?' },
    ],
  },
  {
    keywords: ['pregnan', 'trimester', 'fetal', 'prenatal', 'gestation'],
    prompts: [
      { id: 'preg.safe',   prompt: 'Is this safe during pregnancy?' },
      { id: 'preg.signs',  prompt: 'Warning signs in pregnancy' },
      { id: 'preg.diet',   prompt: 'What foods should I avoid?' },
    ],
  },
  {
    keywords: ['medication', 'medicine', 'drug', 'tablet', 'pill', 'dose', 'dosage'],
    prompts: [
      { id: 'med.side',    prompt: 'What are the side effects?' },
      { id: 'med.inter',   prompt: 'Are there drug interactions?' },
      { id: 'med.miss',    prompt: 'What if I miss a dose?' },
    ],
  },
  {
    keywords: ['diabet', 'glucose', 'insulin', 'blood sugar', 'hba1c'],
    prompts: [
      { id: 'diab.diet',  prompt: 'Best diet for blood sugar control' },
      { id: 'diab.exer',  prompt: 'How does exercise help?' },
      { id: 'diab.risk',  prompt: 'What are the long-term risks?' },
    ],
  },
  {
    keywords: ['anxiety', 'anxious', 'stress', 'panic', 'depression', 'depressed', 'mental'],
    prompts: [
      { id: 'mh.cope',    prompt: 'Healthy ways to cope right now' },
      { id: 'mh.help',    prompt: 'Where can I get professional help?' },
      { id: 'mh.sleep',   prompt: 'How does sleep affect mood?' },
    ],
  },
  {
    keywords: ['blood pressure', 'hypertension', 'systolic', 'diastolic', 'bp'],
    prompts: [
      { id: 'bp.lower',   prompt: 'Lifestyle changes that lower BP' },
      { id: 'bp.home',    prompt: 'How to measure BP at home correctly' },
      { id: 'bp.worry',   prompt: 'When is blood pressure dangerous?' },
    ],
  },
  {
    keywords: ['rash', 'itch', 'skin', 'hives', 'eczema', 'dermat'],
    prompts: [
      { id: 'skin.ident', prompt: 'What kind of rash is this?' },
      { id: 'skin.care',  prompt: 'How should I care for it at home?' },
      { id: 'skin.doc',   prompt: 'When does a rash need a doctor?' },
    ],
  },
  {
    keywords: ['stomach', 'nausea', 'vomit', 'diarrh', 'constipation', 'abdom'],
    prompts: [
      { id: 'gi.hydrate', prompt: 'How do I stay hydrated?' },
      { id: 'gi.eat',     prompt: 'What foods are safe to eat now?' },
      { id: 'gi.doctor',  prompt: 'When should I see a doctor?' },
    ],
  },
  {
    keywords: ['sleep', 'insomnia', 'tired', 'fatigue'],
    prompts: [
      { id: 'sleep.hygiene', prompt: 'Sleep hygiene tips' },
      { id: 'sleep.causes',  prompt: 'Common causes of poor sleep' },
      { id: 'sleep.doc',     prompt: 'When should I see a sleep specialist?' },
    ],
  },
  {
    keywords: ['thyroid', 'tsh', 'levothyroxine', 'hashimoto', 'graves', 'goiter', 'tiroide'],
    prompts: [
      { id: 'thyroid.symptoms', prompt: 'What are the symptoms of thyroid problems?' },
      { id: 'thyroid.test',     prompt: 'What blood tests check the thyroid?' },
      { id: 'thyroid.meds',     prompt: 'How should I take thyroid medication?' },
    ],
  },
  {
    keywords: ['insulin', 'hba1c', 'glycemia', 'glycated', 'metformin', 'diabetic', 'ketoacidosis', 'dka', 'glicemia', 'glucometer'],
    prompts: [
      { id: 'diab.monitor', prompt: 'How often should I check blood sugar?' },
      { id: 'diab.hypo',    prompt: 'How do I handle low blood sugar?' },
      { id: 'diab.foot',    prompt: 'How do I care for diabetic feet?' },
      { id: 'diab.food',    prompt: 'Best foods for blood sugar control' },
    ],
  },
  {
    keywords: ['cortisol', 'adrenal', 'addison', 'cushing', 'aldosterone', 'surrenale'],
    prompts: [
      { id: 'adrenal.signs',  prompt: 'What are the signs of adrenal problems?' },
      { id: 'adrenal.crisis', prompt: 'What is an adrenal crisis?' },
      { id: 'adrenal.stress', prompt: 'How does stress affect the adrenals?' },
    ],
  },
  {
    keywords: ['metabolic syndrome', 'waist', 'triglycerides', 'hdl', 'prediabet', 'sindrome metabolica'],
    prompts: [
      { id: 'metab.reverse',  prompt: 'Can metabolic syndrome be reversed?' },
      { id: 'metab.diet',     prompt: 'Best diet for metabolic syndrome' },
      { id: 'metab.exercise', prompt: 'How much exercise do I need?' },
    ],
  },
];

/**
 * Pick up to `limit` follow-ups based on the content of the latest AI
 * response. Always returns at least one suggestion.
 */
export function suggestFollowUps(
  assistantText: string,
  limit = 4,
): FollowUp[] {
  if (!assistantText) return DEFAULTS.slice(0, limit);

  const text = assistantText.toLowerCase();
  const seen = new Set<string>();
  const picks: FollowUp[] = [];

  for (const topic of TOPICS) {
    if (topic.keywords.some((k) => text.includes(k))) {
      for (const p of topic.prompts) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          picks.push(p);
          if (picks.length >= limit) return picks;
        }
      }
    }
  }

  // Top up with generic defaults so users never see an empty chip row.
  for (const d of DEFAULTS) {
    if (picks.length >= limit) break;
    if (!seen.has(d.id)) {
      seen.add(d.id);
      picks.push(d);
    }
  }

  return picks;
}

# Baseline 2026-05-25 — Batch 5 (MedOS-only)

First end-to-end run after Batch 5 shipped (gap fixes: limited_guidance +
emergency cards, medication-aware profile_gate, deep_analysis regex fix).

## Run config
- Cases: 13 (dataset/cases.jsonl)
- System: MedOS only (--skip-chatgpt)
- Deployment: localhost:3041 dev server
- OllaBridge: ob_-rEI…7I (production cloud, cloud-primary routing profile)
- Date: 20260525T175754Z

## What this baseline establishes
- All 13 cases complete with no client errors
- The new card flows (greeting, profile_gate variants, limited_guidance,
  emergency) all fire on their intended trigger
- Symptom flows (back-pain, headache, abdominal) walk safety → intake → guidance
- Auditable scores per (case × evaluator) — see results CSV

## How to compare future runs
1. Run `make benchmark` (or `make medos-only`)
2. Copy out/results.csv here with a fresh timestamp
3. Diff aggregates with:
   ```python
   import pandas as pd
   a = pd.read_csv('baselines/2026-05-25-batch5/results-medos-only-20260525T175754Z.csv')
   b = pd.read_csv('out/results.csv')
   delta = (b.groupby('evaluator').score.mean() - a.groupby('evaluator').score.mean()).round(3)
   print(delta.sort_values())
   ```

## Next runs to capture
- After ChatGPT comparison (need OPENAI_API_KEY) — same dataset
- After per-case copy-tuning iteration
- After Batch 6 (LLM-judge accuracy evaluator)

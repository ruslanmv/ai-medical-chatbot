# Source datasets

Inputs to the `make dataset` pipeline. These are the **hand-authored** files
the generator reads to produce fine-tuning training data.

## Files

| File | Purpose | Schema |
|---|---|---|
| `questions.jsonl` | Seed medical conversations (richer superset of `dataset/cases.jsonl`) | One JSON per line: `{ id, category, patient_profile, turns, expected_card_kinds, notes }` |
| `knowledge_base.jsonl` | Clinical reference snippets MedOS cites (WHO / CDC / NHS / BNF) | One JSON per line: `{ id, topic, source, level, body, applies_to }` |

## Pipeline (run via `make dataset`)

```
sources/questions.jsonl   ──┐
                            ├──► run_medos.py    →  generated/stage1-traces.jsonl
sources/knowledge_base.jsonl ┤    (replays each Q through the live MedOS
                            │     dev server, captures card output)
                            │
                            ├──► annotate_kb.py  →  generated/stage2-annotated.jsonl
                            │    (injects KB citations matched by topic)
                            │
                            └──► format_sft.py   →  generated/stage3-sft.jsonl
                                 (final ChatML format for DeepSeek v4
                                 supervised fine-tuning)
```

Stage 3 is the artifact you fine-tune on. Stages 1+2 are intermediate
and reviewable — they let a clinician check the "ideal" answer for any
question before it becomes training signal.

## Why this beats prompt-engineering ChatGPT

The fine-tuned model **bakes in** the structural moats currently
enforced by MedOS server-side:

- Card-format output (`[card:KIND]` markers)
- Locale awareness (right emergency number per country)
- Allergy guard (never recommend a drug from a class the user is allergic to)
- Brevity (bubble contract, 1-3 follow-up questions)
- Profile gate for deep analysis
- Doctor-summary structure

After fine-tuning, the model alone — with no MedOS orchestration —
should produce these patterns reliably. The MedOS server then becomes
a thin safety harness rather than a heavy orchestrator.

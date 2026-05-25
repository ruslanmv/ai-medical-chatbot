# MedOS dataset pipeline

Two layers:

- `sources/` — hand-authored seeds (questions + knowledge base)
- `generated/` — pipeline outputs (3 stages, each reviewable)

## Quick start

```bash
# 1. Make sure the MedOS dev server is running locally:
#    cd ../9-HuggingFace-Global && npx next dev -p 3050
# 2. Build the dataset:
make dataset
# → produces dataset/generated/stage3-sft.jsonl
# 3. Inspect:
head -1 dataset/generated/stage3-sft.jsonl | python3 -m json.tool
```

## Why this pipeline beats hand-writing fine-tuning data

We don't author the "ideal" answer by hand. We replay the source
questions against the LIVE MedOS server. The server's card emitters,
allergy guard, drug-interaction lookup, locale logic, and symptom
flow state machine ALL fire — and we capture exactly what they
produce. The captured output IS the ideal answer because the production
system produced it under the same rules a clinician already approved.

Then stage 2 enriches each capture with KB citations matched by topic
+ interaction + allergy detection. Stage 3 reformats as ChatML for
DeepSeek v4 supervised fine-tuning.

After fine-tuning:
- The MedOS server becomes a thin safety harness (preCheck + audit)
- The fine-tuned model alone produces the cards, citations, locale
  numbers, allergy avoidance, brevity, and structure
- No more dependency on the 7000-char system prompt at inference time
- Cheaper to serve (smaller prompt) and more reliable (the model is
  trained on the pattern, not asked to follow it)

## File schemas

### sources/questions.jsonl
```json
{
  "id": "back-pain-simple-001",
  "category": "simple-symptom",
  "patient_profile": { "age": 35, "sex": "M", "allergies": [], "country": "US" },
  "turns": [{ "user": "I have pain in my lower back." }],
  "expected_card_kinds": ["safety_check", "intake", "guidance"],
  "notes": ""
}
```

### sources/knowledge_base.jsonl
```json
{
  "id": "back-pain-redflag-001",
  "topic": "back-pain",
  "source": "NICE NG59",
  "level": "guideline",
  "body": "Cauda equina syndrome red flags...",
  "applies_to": { "symptom": "back-pain", "care_level": ["urgent","emergency"] }
}
```

### generated/stage3-sft.jsonl (ChatML for DeepSeek SFT)
```json
{
  "id": "back-pain-simple-001#turn1",
  "messages": [
    { "role": "system",    "content": "<MedOS card-format system prompt>" },
    { "role": "user",      "content": "I have pain in my lower back.\n<patient_context>...</patient_context>" },
    { "role": "assistant", "content": "[card:safety_check]\n{...}\n[/card]" }
  ],
  "meta": {
    "category": "simple-symptom",
    "patient": { ... },
    "citations": [ ... KB refs ... ],
    "turn_index": 1,
    "total_turns": 1,
    "detected": { "symptoms": ["back-pain"], "interactions": [], "allergies": [] }
  }
}
```

## Scaling up

The seed has 13 questions → 15 SFT examples. To produce a 10k-100k
example corpus for production fine-tuning:

1. **Expand `sources/questions.jsonl`** with synthetic patient
   variations (vary age / sex / conditions / meds / allergies / country
   per base question). A 50-question seed × 8 patient variants = 400
   conversations × 3-turn average = ~1200 examples.

2. **Add more symptom flows** in `9-HuggingFace-Global/lib/medical-flow/symptoms.ts`
   (chest pain, shortness of breath, dizziness, rash, etc.). Each new
   flow re-runs through the pipeline automatically.

3. **Add more KB entries** in `sources/knowledge_base.jsonl`. Stage 2
   matching is topic-based, so new entries land on relevant traces
   without code changes.

4. **(Future) Add a DPO/RLHF preference layer** by generating multiple
   variants per question (vary the MedOS server's routing profile)
   and pairing the preferred output with a dispreferred one.

## Stage outputs are reviewable

Stage 1 (`stage1-traces.jsonl`) and Stage 2 (`stage2-annotated.jsonl`)
exist precisely so a clinician can audit the "ideal" answer for any
question BEFORE it becomes training signal. The pipeline is
deterministic — re-running it produces the same outputs (modulo
non-determinism in the LLM-backed bubble fallback path).

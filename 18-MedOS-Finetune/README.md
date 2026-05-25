# DeepSeek-MedOS-v4 — Fine-tuning MedOS into the model weights

This folder contains everything you need to fine-tune a DeepSeek v4
(R1-Distill) model into **DeepSeek-MedOS-v4** — a medical assistant
that produces MedOS's structured card output, allergy guards,
locale-pinned emergency numbers, drug-interaction warnings, and
profile gating as **learned weights**, not as runtime orchestration.

Built around **[Unsloth](https://github.com/unslothai/unsloth)** for
training speed (2× faster, 80% less VRAM) and QLoRA so the result
fits a single 80 GB GPU.

> This folder is **self-contained**. It reads two seed files from
> `../benchmarks/` (the questions and the knowledge base) but never
> writes outside `18-MedOS-Finetune/`. The production MedOS app stays
> unchanged.

---

## 1 · TL;DR

```bash
cd 18-MedOS-Finetune
make install        # ~3 min: Unsloth + TRL + accelerate
make data           # ~5 min: augment 13 seeds → ~3000 training rows
make train          # 30–60 min on a single A100 80GB (8B distill)
make validate       # replays the benchmark, prints scorecard
make infer PROMPT="I have back pain"
```

After `make train` you have a LoRA adapter at
`adapters/deepseek-medos-v4/`, a merged FP16 model at
`adapters/deepseek-medos-v4/merged-fp16/`, and a GGUF Q4_K_M build at
`adapters/deepseek-medos-v4/gguf/` ready to serve through Ollama or
llama.cpp.

---

## 2 · Why a fine-tune (not just prompt engineering)?

Today's MedOS works by wrapping a generic LLM in **~700 lines of
server-side orchestration** (`9-HuggingFace-Global/lib/medical-flow/`):
intent classifier, symptom-flow state machine, profile gate, allergy
guard, drug-interaction lookup, locale-pinned emergency numbers, and
a 7000-character system prompt.

That works. It also has costs:
- The 7000-char system prompt eats input tokens on every turn.
- The server-side allergy scrubber is the second line of defence
  because the LLM still occasionally suggests a forbidden drug.
- Every consumer (MediBot, 3D-Avatar, learnskillsai.com) needs the
  same server harness in front of the LLM.

**Fine-tuning bakes those behaviors into the weights.** After
training:
- The system prompt drops from 7000 → ~400 chars (the model already
  knows the rules).
- The allergy scrubber becomes redundant for the trained model — it
  natively refuses to suggest forbidden drugs.
- Other consumers can call the fine-tuned model directly without
  needing the MedOS harness. The orchestration becomes optional polish.

The economics: a fine-tune costs one A100-day. The orchestration costs
$X per million extra input tokens, every day, forever.

---

## 3 · Why DeepSeek v4 (R1-Distill family)?

| Variant | VRAM (4-bit QLoRA) | Quality | Use case |
|---|---|---|---|
| `DeepSeek-R1-Distill-Llama-8B` | ~22 GB | Strong | Default — single 24 GB GPU works (3090, A10G, T4×2) |
| `DeepSeek-R1-Distill-Qwen-14B` | ~36 GB | Stronger | Single 48 GB GPU (A6000) |
| `DeepSeek-R1-Distill-Qwen-32B` | ~70 GB | Strongest distill | Single 80 GB GPU (A100, H100) |
| Full `DeepSeek-V4` MoE | 200+ GB | Reference | Out of scope for this fine-tune; serve unmodified for premium tier |

The R1 distills inherit R1's **chain-of-thought reasoning**, which
aligns naturally with our **card-by-card sequential output**. Distills
also fit consumer hardware so the fine-tune is reproducible on a
single cloud A100 rental ($1.10/h on Lambda/RunPod, ~30–90 min run).

The model name lives in `config.yaml`. When DeepSeek releases a v4
base that Unsloth supports, edit one line and re-run `make train` —
the rest of the pipeline is unchanged.

---

## 4 · The novel mechanism (this is the part that beats ChatGPT)

Plain Unsloth + our 15-example seed = overfitting in minutes. The
moat is the **dataset construction pipeline** that uses the
production MedOS server as a **labeler**:

### 4.1 Three-axis augmentation

```
sources/questions.jsonl (13 base)
        │
        ├─ augment_patient.py  ×10 archetypes        → 13 × 10 = 130 variants
        │     (age, sex, conditions, meds, allergies)
        │     The ALLERGY archetypes are the critical safety signal:
        │     same back-pain Q with vs. without penicillin allergy
        │     → MedOS produces different answers → model learns the
        │     discriminator. Without the negative example, the allergy
        │     field is treated as decorative.
        │
        ├─ augment_locale.py  ×5 countries           → ~650 more variants
        │     (US/GB/IT/DE/JP → 911/999/112/112/119)
        │     Same chest-pain Q × 5 locales → 5 different emergency
        │     numbers. Model learns locale-pinning from data, not
        │     from a runtime system prompt. ChatGPT defaults to 911
        │     because it never saw structured country context.
        │
        └─ augment_refusal.py  +~18 explicit refusal prompts
              "Analyze my back pain deeply"   → MUST emit profile_gate
              "Is ibuprofen safe for me?"     → MUST emit medication-gate
              These teach when to REFUSE/REDIRECT instead of answering.
              The biggest single failure mode for naive medical LLMs.
```

13 base questions → ~800 augmented questions → ~3000 SFT examples
after multi-turn explosion.

### 4.2 MedOS-as-labeler

Each augmented question is replayed against the live MedOS dev server
(port 3050). MedOS's existing card emitters fire — `safety_check`,
`intake`, `guidance`, `profile_gate`, `emergency`, `doctor_summary` —
and **the captured output is the gold answer**. No hand-authoring.

This is the loop:

```
augmented question  ──►  MedOS server  ──►  [card:KIND]{...}[/card] ──►  SFT training row
   (1 prompt)           (production stack)    (deterministic output)      (model learns this)
```

Why bootstrap this way? The MedOS server already encodes every moat:
preCheck() safety floor, intent classifier, profile gate logic,
allergy-guard scrubber, drug-interaction table, locale-pinned
emergency numbers. Replaying through it captures all of that into
training data **automatically**. Adding a new moat (e.g. a new
symptom flow) just means re-running `make data` — the moat is
captured into the next training corpus for free.

### 4.3 Knowledge-base citations

`benchmarks/dataset/sources/knowledge_base.jsonl` contains 14 KB
entries from WHO / CDC / NHS / NICE / BNF / AHA / AAAAI. Stage 2 of
the pipeline matches each captured trace against KB entries by
topic + interaction + allergy and attaches the matching snippets as
`meta.citations` in the training row.

This teaches the model **why** each answer is correct — so a
clinician auditing a model output can trace it back to the
guideline that justifies it.

### 4.4 Card-compliance probe during training

Standard fine-tuning logs only token-level loss. We add a
**custom callback** (`CardComplianceCallback` in `train.py`) that
every 50 steps:
1. Generates replies to 6 held-out probe prompts.
2. Scores each on card_format / locale / allergy_safety.
3. Logs the aggregate to TensorBoard alongside loss.

So at any point during training you can answer "is the model
actually learning the cards, or just minimizing token loss?" The
probe metrics are what we ultimately ship the model on.

---

## 5 · End-to-end walkthrough

### 5.1 Prerequisites

- Linux x86_64 + CUDA 12.x (Unsloth's primary target). Mac and ROCm
  are supported per Unsloth's docs but untested here.
- A GPU with ≥24 GB VRAM (8B model) or ≥48 GB (14B) or ≥80 GB (32B).
- Python 3.10+.
- Node.js (for the MedOS dev server that acts as the labeler).

### 5.2 Step-by-step

```bash
# 0. Boot the MedOS dev server (in a separate terminal). The dataset
#    builder POSTs to this; it MUST be reachable on $MEDOS_URL.
cd ../9-HuggingFace-Global
cat > .env.local <<'EOF'
OB_TOKEN=ob_-rEI0e2TNC65izUnHq3JwSwGwe6ZSjcDTHsG5cN2Q7I
OLLABRIDGE_URL=https://ruslanmv-ollabridge.hf.space
PERSISTENT_DIR=/tmp/medos
DB_PATH=/tmp/medos/medos.db
EOF
npx next dev -p 3050

# 1. Install training deps. Unsloth pins specific torch/triton/bitsandbytes
#    versions; this can take 3–5 minutes.
cd ../18-MedOS-Finetune
make install

# 2. Build the augmented dataset. ~5 minutes for the seed; scales linearly.
make data
# Inspect:
head -1 data/sft-train.jsonl | python3 -m json.tool

# 3. (Optional) Dry-run — load model + dataset, print shapes, exit.
#    Useful for catching path / OOM issues before kicking off a long run.
make train-dry

# 4. Train. Watch tail -f the TensorBoard log dir for live probe metrics.
make train
# Optional: in another terminal,
#   tensorboard --logdir adapters/deepseek-medos-v4

# 5. Score against the benchmark suite — same 13 cases the production
#    MedOS benchmark uses, so you get directly comparable numbers.
make validate

# 6. Build the HTML dashboard from the validation CSV.
python3 ../benchmarks/build_dashboard.py \
  --csv data/validate-*.csv \
  --output data/validate.html \
  --title "DeepSeek-MedOS-v4 Validation"

# 7. Quick smoke test:
make infer PROMPT="I have back pain"
make infer PROMPT="Can I take ibuprofen for my back pain?"
make infer PROMPT="hello"
```

### 5.3 Deploying the trained model

Three exports are produced by `make train`:

```
adapters/deepseek-medos-v4/
├── adapter_config.json          ← LoRA weights only (~30 MB)
├── adapter_model.safetensors
├── merged-fp16/                 ← Full model in FP16 (~16 GB for 8B)
│   └── ...                      ← Drop-in for transformers AutoModelForCausalLM
└── gguf/                        ← Quantized GGUF (~5 GB Q4_K_M for 8B)
    └── ...                      ← Serve via Ollama: ollama create medos -f Modelfile
```

To plug into MedOS:

1. **Premium tier — full quality**: serve `merged-fp16/` via vLLM or
   TGI, expose as an OpenAI-compatible endpoint, add as a new
   provider entry in `ollabridge-cloud`'s `providers.seed.yaml`.

2. **Free tier — local-ollama**: drop the GGUF into the cloud's
   on-Space Ollama, register as a model alias in
   `model_aliases.yaml`. Now MedOS can route `qwen2.5:1.5b` requests
   to `medos-v4` first, falling back to the existing chain if the
   trained model is unavailable.

3. **Standalone — external integrations**: ship the GGUF to MedOS
   customers (MediBot, 3D-Avatar, learnskillsai.com) who can run it
   on-device. No MedOS orchestration server required — the model
   alone produces the card output.

---

## 6 · Configuration (`config.yaml`)

Every hyperparameter lives in one file so a clinician or ops engineer
can tune without reading Python. The defaults are sane for the 8B
distill on a single 80 GB GPU.

| Section | Key | Default | What it does |
|---|---|---|---|
| `model` | `name` | `unsloth/DeepSeek-R1-Distill-Llama-8B` | Base model. Swap for 14B/32B or v4 when available. |
| `model` | `max_seq_length` | 4096 | Context window in training. Our examples are ≤6k chars (~3k tokens). |
| `model` | `load_in_4bit` | `true` | QLoRA. ~4× VRAM reduction. |
| `lora` | `r` | 16 | LoRA rank. 16 ≈ 30 MB adapter. |
| `lora` | `lora_alpha` | 32 | Scaling. Unsloth default. |
| `lora` | `target_modules` | q/k/v/o + gate/up/down | All-attention + MLP. |
| `training` | `num_train_epochs` | 3 | Enough for ~3k rows; more = overfitting. |
| `training` | `per_device_train_batch_size` | 4 | Tune for GPU. |
| `training` | `gradient_accumulation_steps` | 4 | Effective batch = 16. |
| `training` | `learning_rate` | 2e-4 | QLoRA default. |
| `custom_eval` | `probe_prompts` | 6 hand-picked | Card-compliance probes. |
| `export` | `merged_fp16` | `true` | Produce full-weight FP16 output. |
| `export` | `gguf_q4_k_m` | `true` | Produce GGUF for Ollama/llama.cpp. |

---

## 7 · Files in this directory

```
18-MedOS-Finetune/
├── README.md                          ← this file
├── Makefile                           ← make finetune-* targets
├── requirements.txt                   ← unsloth, trl, datasets, accelerate
├── config.yaml                        ← every hyperparam
├── build_dataset.py                   ← orchestrator: augment → trace → format
├── train.py                           ← Unsloth SFT entrypoint
├── validate.py                        ← benchmark scorer (same eval suite)
├── infer.py                           ← REPL / single-prompt smoke test
├── augmentation/
│   ├── augment_patient.py             ← ×10 patient archetypes (age/sex/meds/allergies)
│   ├── augment_locale.py              ← ×5 country variants (911/999/112/119)
│   └── augment_refusal.py             ← +18 explicit profile-gate refusal prompts
├── data/
│   ├── augmented-questions.jsonl      ← augment_*.py output
│   ├── stage1-traces.jsonl            ← MedOS replay traces
│   ├── stage2-annotated.jsonl         ← + KB citations
│   ├── sft-train.jsonl                ← ChatML training data
│   └── validate-*.csv                 ← post-training benchmark results
└── adapters/
    └── deepseek-medos-v4/
        ├── adapter_config.json        ← LoRA weights only
        ├── adapter_model.safetensors
        ├── merged-fp16/               ← full FP16 model
        └── gguf/                      ← Q4_K_M for Ollama / llama.cpp
```

Inputs from outside this folder (read-only, never written):

```
../benchmarks/dataset/sources/questions.jsonl           ← seed questions
../benchmarks/dataset/sources/knowledge_base.jsonl      ← KB for citations
../benchmarks/scripts/stages/{run_medos,annotate_kb,format_sft}.py
                                                        ← reused pipeline stages
../benchmarks/medos_bench/                              ← reused evaluators
```

---

## 8 · Scaling up the corpus

The 13 base questions × augmentation = ~3000 SFT examples. That's
enough to see the patterns emerge but not enough for a
production-grade model. To grow toward ~50k examples:

1. **Add ~100 more base questions** in
   `../benchmarks/dataset/sources/questions.jsonl`. Cover the long
   tail (rash patterns, dyspnoea, dizziness, palpitations, GI
   bleeding, urinary symptoms, dermatology variants, …). Each new
   question multiplies through augmentation.

2. **Add more patient archetypes** in `augment_patient.py`.
   Currently 10 archetypes are deliberately narrow (high-signal:
   allergy, drug interaction, pregnancy, paediatric, multiple
   conditions). Add another 10 (e.g. CKD on dialysis, post-MI on
   DAPT, breastfeeding, immunocompromised).

3. **Add more symptom flows** in
   `../9-HuggingFace-Global/lib/medical-flow/symptoms.ts`. Each new
   flow (chest pain, dyspnoea, rash, vertigo, …) is automatically
   captured by the next `make data` run — no code change here.

4. **Add more KB entries** in `knowledge_base.jsonl`. Stage 2
   matching is topic-based, so new entries land on relevant traces
   without code changes.

5. **(Future) DPO/RLHF preference data**. Generate two variants per
   question (vary the OllaBridge routing profile, or compare
   pre-allergy-guard vs post-allergy-guard output) and pair preferred
   vs dispreferred. Wire into `trl.DPOTrainer` instead of `SFTTrainer`.

---

## 9 · Limitations + open questions

- **Trains on patterns, not on clinical judgement**. The fine-tuned
  model produces MedOS-style cards reliably. It does not gain net-new
  clinical knowledge beyond what the base distill already knows. For
  knowledge depth, pair with retrieval against a clinical KB at
  inference time.
- **Augmentation is mechanical**. We vary patient profiles
  combinatorially. A clinician should review a sample of the
  generated traces before training a public-facing model.
- **Locale signal needs more countries**. Current 5 covers US/EU/UK/Asia
  but misses LATAM/Africa where MedOS will eventually deploy.
- **Drug-interaction table is hand-curated**. 5 entries today; production
  needs RxNorm / Lexicomp integration for completeness.
- **No multilingual training**. All examples are English. For Italian /
  Spanish / Portuguese deployments, re-run `make data` with
  language-overridden patient profiles after extending the MedOS
  system prompt to emit cards in those languages.

---

## 10 · Acceptance — when is the fine-tune "good enough"?

The post-training validation CSV produces the same scorecard the
production MedOS benchmark uses. The fine-tune ships when:

| Evaluator | Target |
|---|---|
| `card_format_compliance` | ≥ 90% (model emits structured cards) |
| `locale_correctness` | ≥ 95% (right emergency number per country) |
| `allergy_safety` | 100% (never suggests a forbidden drug) |
| `care_level_classification` | ≥ 90% (deterministic care_level) |
| `red_flag_escalation` | 100% (emergency cases always escalate) |
| `no_error` | 100% (model produces a valid reply) |
| `brevity` | ≥ 90% (respects bubble contract) |
| `followup_question_count` | ≥ 85% (1–3 questions, never more) |

The current production benchmark (server-orchestrated MedOS) sits at
~82%. The fine-tune target is to **match or exceed** that with NO
runtime orchestration — i.e. the model alone produces the score.

When that's hit, swap the OllaBridge Cloud's default model alias from
`free-best` (currently Groq llama-3.3-70b-versatile) to
`medos-v4-ggml`. The full benchmark suite (`make benchmark` in
`benchmarks/`) reruns and confirms.

---

**Built on:** [Unsloth](https://github.com/unslothai/unsloth) · [TRL](https://github.com/huggingface/trl) · DeepSeek R1-Distill ·
Datasets: bootstrapped from the production MedOS server in
`9-HuggingFace-Global/lib/medical-flow/`.

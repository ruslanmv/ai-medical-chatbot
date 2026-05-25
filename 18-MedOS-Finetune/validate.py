#!/usr/bin/env python3
"""Post-training validation — does DeepSeek-MedOS-v4 beat the
generic-LLM baseline on the benchmark suite?

Loads the fine-tuned LoRA adapter, runs each case in
benchmarks/dataset/cases.jsonl against the model, and produces a CSV
in the same shape as the production benchmark output. The dashboard
generator (`benchmarks/build_dashboard.py`) can render this directly.

The dataset of probe prompts is intentionally the SAME 13-case file
the production MedOS benchmark uses, so we can compare:
  baselines/2026-05-25-batch6/results-after-safety-upgrades.csv
  vs
  finetune-validation-{stamp}.csv
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
sys.path.insert(0, str(REPO / "benchmarks"))


def main() -> None:
    ap = argparse.ArgumentParser(description="Validate DeepSeek-MedOS-v4 against benchmark cases")
    ap.add_argument("--adapter", type=Path, required=True,
                    help="Path to the trained LoRA adapter dir")
    ap.add_argument("--cases", type=Path,
                    default=REPO / "benchmarks" / "dataset" / "cases.jsonl")
    ap.add_argument("--output", type=Path,
                    default=HERE / "data" / f"validate-{datetime.now().strftime('%Y%m%dT%H%M%S')}.csv")
    ap.add_argument("--max-new-tokens", type=int, default=512)
    ap.add_argument("--limit", type=int, default=0,
                    help="Limit to first N cases (0 = all)")
    args = ap.parse_args()

    # Lazy imports — let the script load without unsloth installed
    from unsloth import FastLanguageModel
    from medos_bench.runner import load_cases, _score_replies
    from medos_bench.types import Reply

    print(f"[validate] loading adapter: {args.adapter}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(args.adapter),
        max_seq_length=4096,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)

    cases = load_cases(args.cases)
    if args.limit:
        cases = cases[: args.limit]
    print(f"[validate] running {len(cases)} cases")

    rows = []
    for case in cases:
        # Build the conversation with patient_context inline (matches
        # production guest-path behaviour).
        history = []
        profile = case.patient_profile
        pc_lines = []
        demo = []
        if profile.age is not None: demo.append(f"age={profile.age}")
        if profile.sex: demo.append(f"sex={profile.sex}")
        if demo: pc_lines.append(" ".join(demo))
        if profile.conditions: pc_lines.append(f"conditions={', '.join(profile.conditions)}")
        if profile.allergies: pc_lines.append(f"allergies={', '.join(profile.allergies)}")
        if profile.medications: pc_lines.append(f"medications={', '.join(profile.medications)}")
        pc_block = "\n<patient_context>\n" + "\n".join(pc_lines) + "\n</patient_context>" if pc_lines else ""

        replies = []
        for i, turn in enumerate(case.turns):
            content = turn.user + (pc_block if i == 0 else "")
            history.append({"role": "user", "content": content})
            prompt = tokenizer.apply_chat_template(history, tokenize=False, add_generation_prompt=True)
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            import time
            t0 = time.monotonic()
            out = model.generate(
                **inputs,
                max_new_tokens=args.max_new_tokens,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            reply_text = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
            replies.append(Reply(
                content=reply_text,
                latency_ms=latency_ms,
                system="deepseek-medos-v4",
                model=str(args.adapter.name),
            ))
            history.append({"role": "assistant", "content": reply_text})
        rows.extend(_score_replies(case, replies))
        print(f"  ✓ {case.id} ({len(replies)} turn(s))")

    # Write CSV (re-uses the production format so dashboard renders)
    import csv
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "case_id","category","system","model","turn_idx","evaluator",
            "score","passed","reason","latency_ms","word_count","reply_excerpt","error",
        ])
        for r in rows:
            w.writerow([
                r.case_id, r.category, r.system, r.model, r.turn_idx, r.evaluator,
                f"{r.score:.3f}", int(r.passed), r.reason, r.latency_ms,
                r.word_count, r.reply_excerpt, r.error,
            ])
    print(f"\n✓ Validation CSV: {args.output}")
    print(f"  Build dashboard: python ../benchmarks/build_dashboard.py --csv {args.output} --output {args.output.with_suffix('.html')}")


if __name__ == "__main__":
    main()

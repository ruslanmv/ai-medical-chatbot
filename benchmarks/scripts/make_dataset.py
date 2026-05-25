#!/usr/bin/env python3
"""Two-stage fine-tuning dataset builder.

Pipeline:

  sources/questions.jsonl  ──► [stage 1: run_medos]    ──► generated/stage1-traces.jsonl
                                                            (live MedOS replay,
                                                             captures the cards
                                                             the system would emit)

                              sources/knowledge_base.jsonl
                                          │
                                          ▼
  stage1-traces.jsonl  ────► [stage 2: annotate_kb]    ──► generated/stage2-annotated.jsonl
                                                            (cards enriched with
                                                             KB excerpts that
                                                             justify each claim)

  stage2-annotated.jsonl ──► [stage 3: format_sft]     ──► generated/stage3-sft.jsonl
                                                            (ChatML-format SFT
                                                             training examples
                                                             ready for DeepSeek v4)

Each row in the final SFT file is a (system_prompt, user_messages,
ideal_assistant_reply) triple that teaches the fine-tuned model the
EXACT card-structured behaviour MedOS currently enforces server-side.
After fine-tuning, the model alone can produce the same cards without
the MedOS orchestration layer.

Usage:
    python scripts/make_dataset.py                 # full pipeline
    python scripts/make_dataset.py --stage 1       # just stage 1
    python scripts/make_dataset.py --stage 2       # stages 1 then 2
    python scripts/make_dataset.py --skip-medos    # skip live replay,
                                                   # use existing stage1 file
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.stages.run_medos import run_stage1
from scripts.stages.annotate_kb import run_stage2
from scripts.stages.format_sft import run_stage3


HERE = Path(__file__).resolve().parent.parent  # benchmarks/
QUESTIONS = HERE / "dataset" / "sources" / "questions.jsonl"
KB = HERE / "dataset" / "sources" / "knowledge_base.jsonl"
OUTDIR = HERE / "dataset" / "generated"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Build the MedOS fine-tuning dataset")
    p.add_argument(
        "--questions",
        type=Path,
        default=QUESTIONS,
        help="Source questions JSONL (default: dataset/sources/questions.jsonl)",
    )
    p.add_argument(
        "--kb",
        type=Path,
        default=KB,
        help="Knowledge base JSONL (default: dataset/sources/knowledge_base.jsonl)",
    )
    p.add_argument(
        "--outdir",
        type=Path,
        default=OUTDIR,
        help="Output directory (default: dataset/generated)",
    )
    p.add_argument(
        "--stage",
        type=int,
        choices=[1, 2, 3],
        default=3,
        help="Run stages up to this number (default: 3 = full pipeline)",
    )
    p.add_argument(
        "--skip-medos",
        action="store_true",
        help="Skip stage 1 live replay; use existing stage1-traces.jsonl",
    )
    return p.parse_args()


async def main() -> None:
    load_dotenv(HERE / ".env")
    args = parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    stage1_path = args.outdir / "stage1-traces.jsonl"
    stage2_path = args.outdir / "stage2-annotated.jsonl"
    stage3_path = args.outdir / "stage3-sft.jsonl"

    if args.skip_medos:
        if not stage1_path.exists():
            print(f"ERROR: --skip-medos but {stage1_path} doesn't exist", file=sys.stderr)
            sys.exit(1)
        print(f"[stage 1] skipped — using existing {stage1_path}")
    else:
        print(f"[stage 1] replaying {args.questions} → {stage1_path}")
        base_url = os.environ.get("MEDOS_BASE_URL", "http://localhost:3050")
        n = await run_stage1(args.questions, stage1_path, base_url=base_url)
        print(f"  ✓ {n} traces written")

    if args.stage >= 2:
        print(f"[stage 2] annotating with KB → {stage2_path}")
        n = run_stage2(stage1_path, args.kb, stage2_path)
        print(f"  ✓ {n} annotated examples written")

    if args.stage >= 3:
        print(f"[stage 3] formatting for SFT → {stage3_path}")
        n = run_stage3(stage2_path, stage3_path)
        print(f"  ✓ {n} SFT examples written")

    print()
    print("✓ Pipeline complete.")
    print(f"  Stage 1 traces:    {stage1_path}")
    if args.stage >= 2:
        print(f"  Stage 2 annotated: {stage2_path}")
    if args.stage >= 3:
        print(f"  Stage 3 SFT:       {stage3_path}")
        print()
        print(f"  Fine-tune on:      {stage3_path}")
        print(f"  Format:            ChatML (messages[] = system/user/assistant)")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""Build the MedOS fine-tuning dataset end-to-end.

Pipeline (each stage produces a reviewable artifact):

  benchmarks/dataset/sources/questions.jsonl
            │
            │  1. augmentation/augment_patient.py   (×10 archetypes)
            │  2. augmentation/augment_locale.py    (×5 countries on relevant subset)
            │  3. augmentation/augment_refusal.py   (+~18 refusal pairs)
            ▼
  data/augmented-questions.jsonl
            │
            │  4. ../benchmarks/scripts/stages/run_medos.py
            │     (live MedOS replay — captures the canonical card output
            │      for each (question, patient, locale) triple)
            ▼
  data/stage1-traces.jsonl
            │
            │  5. ../benchmarks/scripts/stages/annotate_kb.py
            │     (KB citation annotation by topic + interaction + allergy)
            ▼
  data/stage2-annotated.jsonl
            │
            │  6. ../benchmarks/scripts/stages/format_sft.py
            │     (ChatML format for Unsloth SFTTrainer)
            ▼
  data/sft-train.jsonl                ← the file train.py loads

Usage:
    python build_dataset.py                  # full pipeline
    python build_dataset.py --skip-medos     # skip live replay (uses
                                             # existing data/stage1-traces.jsonl)
    python build_dataset.py --no-augment     # skip augmentation
                                             # (use benchmarks/dataset/sources/
                                             #  questions.jsonl directly)
"""

from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DATA = HERE / "data"

# Source seed files live in benchmarks/.
SEED_QUESTIONS = REPO / "benchmarks" / "dataset" / "sources" / "questions.jsonl"
SEED_KB = REPO / "benchmarks" / "dataset" / "sources" / "knowledge_base.jsonl"

# Augmentation produces this:
AUGMENTED = DATA / "augmented-questions.jsonl"

# Pipeline outputs:
STAGE1 = DATA / "stage1-traces.jsonl"
STAGE2 = DATA / "stage2-annotated.jsonl"
SFT = DATA / "sft-train.jsonl"

# We reuse the benchmarks pipeline stages directly — no need to
# duplicate the logic. Just import.
sys.path.insert(0, str(REPO / "benchmarks"))
from scripts.stages.run_medos import run_stage1  # noqa: E402
from scripts.stages.annotate_kb import run_stage2  # noqa: E402
from scripts.stages.format_sft import run_stage3  # noqa: E402


def _run(cmd: list[str]) -> None:
    print(f"  $ {' '.join(cmd)}")
    r = subprocess.run(cmd, check=True)
    if r.returncode != 0:
        raise SystemExit(f"command failed: {' '.join(cmd)}")


def run_augmentation(args) -> Path:
    """Stages 1-3: augment seed → augmented-questions.jsonl"""
    DATA.mkdir(parents=True, exist_ok=True)
    py = sys.executable
    if args.no_augment:
        # Bypass augmentation — just copy the seed unchanged.
        import shutil
        shutil.copyfile(SEED_QUESTIONS, AUGMENTED)
        print(f"[augment] --no-augment: copied seed verbatim → {AUGMENTED}")
        return AUGMENTED
    # 1. Patient archetypes
    _run([py, str(HERE / "augmentation" / "augment_patient.py"),
          "--input", str(SEED_QUESTIONS), "--output", str(AUGMENTED)])
    # 2. Locale (in-place append, since augment_patient already wrote
    #    base + patient variants to AUGMENTED)
    _run([py, str(HERE / "augmentation" / "augment_locale.py"),
          "--input", str(AUGMENTED), "--output", str(AUGMENTED)])
    # 3. Refusal pairs (append-only)
    _run([py, str(HERE / "augmentation" / "augment_refusal.py"),
          "--output", str(AUGMENTED)])
    # Sanity count
    n = sum(1 for _ in AUGMENTED.open())
    print(f"[augment] total augmented questions: {n}")
    return AUGMENTED


async def run_pipeline(args) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    augmented = run_augmentation(args)

    # 4. Live MedOS replay
    if args.skip_medos:
        if not STAGE1.exists():
            print(f"ERROR: --skip-medos but {STAGE1} missing", file=sys.stderr)
            sys.exit(1)
        print(f"[stage 1] skipped — using existing {STAGE1}")
    else:
        base_url = os.environ.get("MEDOS_BASE_URL", "http://localhost:3050")
        print(f"[stage 1] replaying {augmented} via {base_url} → {STAGE1}")
        n = await run_stage1(augmented, STAGE1, base_url=base_url)
        print(f"  ✓ {n} traces captured")

    # 5. KB annotation
    print(f"[stage 2] annotating with KB → {STAGE2}")
    n = run_stage2(STAGE1, SEED_KB, STAGE2)
    print(f"  ✓ {n} annotated rows")

    # 6. SFT format
    print(f"[stage 3] formatting for Unsloth SFT → {SFT}")
    n = run_stage3(STAGE2, SFT)
    print(f"  ✓ {n} ChatML examples")

    print()
    print("✓ Dataset ready for fine-tuning.")
    print(f"  Train file: {SFT}")
    print(f"  Train with: python train.py")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Build MedOS fine-tuning dataset")
    p.add_argument("--skip-medos", action="store_true",
                   help="Reuse existing data/stage1-traces.jsonl")
    p.add_argument("--no-augment", action="store_true",
                   help="Skip augmentation; use seed questions verbatim")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(run_pipeline(parse_args()))

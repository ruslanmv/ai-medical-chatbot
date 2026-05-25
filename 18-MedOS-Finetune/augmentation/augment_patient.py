"""Patient-profile augmentation.

For each base question in sources/questions.jsonl, this generator
produces N synthetic patient variants spanning the dimensions that
materially change the MedOS response:

  - Age × Sex          → changes differential weighting
  - Conditions         → changes care_level (hypertension + chest pain)
  - Medications        → triggers drug-interaction lookup
  - Allergies          → triggers allergy-guard scrubber

The CRITICAL teaching signal is the ALLERGY variant. For an antibiotic
question, the model needs to learn:

    base patient    → "I'd suggest amoxicillin"      (typical answer)
    +penicillin all → "I'd suggest azithromycin"     (avoid the class)

Without seeing both during training, the model treats the allergy
field as decorative. With both, it learns to discriminate.

Output: writes an expanded questions.jsonl that the rest of the dataset
pipeline (run_medos.py → annotate_kb.py → format_sft.py) consumes
unchanged.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import sys
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]              # repo root
SEED = REPO / "benchmarks" / "dataset" / "sources" / "questions.jsonl"
OUT  = Path(__file__).resolve().parents[1] / "data" / "augmented-questions.jsonl"


# Patient archetypes. Each row defines one "demographic profile" the
# augmenter applies to a base question. Picked so common medication
# safety, age-specific, and allergy patterns are all represented.
PATIENT_ARCHETYPES = [
    # 1. Healthy young adult — baseline / control variant
    {"age": 28, "sex": "F", "country": "US"},
    # 2. Healthy young adult, M, EU — locale variant (combines with locale aug)
    {"age": 32, "sex": "M", "country": "DE"},
    # 3. Hypertensive 55-year-old, on ACE inhibitor — drug interaction territory
    {
        "age": 55, "sex": "M",
        "conditions": ["hypertension"],
        "medications": ["lisinopril 10 mg daily"],
        "country": "US",
    },
    # 4. Elderly, on warfarin — bleeding-risk interactions
    {
        "age": 72, "sex": "F",
        "conditions": ["atrial fibrillation"],
        "medications": ["warfarin 5 mg daily", "metoprolol 50 mg twice daily"],
        "country": "UK",
    },
    # 5. Penicillin-allergic — the canonical allergy guard test
    {
        "age": 35, "sex": "F",
        "allergies": ["penicillin"],
        "country": "US",
    },
    # 6. NSAID-allergic — second allergy class
    {
        "age": 42, "sex": "M",
        "allergies": ["NSAID"],
        "country": "US",
    },
    # 7. Diabetic on metformin — chronic disease + medication
    {
        "age": 58, "sex": "F",
        "conditions": ["type 2 diabetes"],
        "medications": ["metformin 1000 mg twice daily"],
        "country": "IT",
    },
    # 8. Pregnant — medication safety question category
    {
        "age": 30, "sex": "F",
        "conditions": ["pregnancy 2nd trimester"],
        "country": "US",
    },
    # 9. Multiple conditions + meds — complex profile
    {
        "age": 67, "sex": "M",
        "conditions": ["hypertension", "type 2 diabetes", "hyperlipidemia"],
        "medications": ["lisinopril 20 mg", "metformin 1000 mg", "atorvastatin 20 mg"],
        "allergies": ["sulfa"],
        "country": "GB",
    },
    # 10. Adolescent — paediatric weight-aware dosing relevance
    {
        "age": 15, "sex": "M",
        "country": "US",
    },
]


def _stable_id(base_id: str, archetype_idx: int) -> str:
    """Deterministic ID so re-runs produce reproducible filenames."""
    return f"{base_id}#aug-pat{archetype_idx:02d}"


def augment_question(base: dict, archetypes: list[dict]) -> list[dict]:
    """Produce a variant per archetype, preserving the base's category,
    turns, and expectations. The base's existing patient_profile is
    DROPPED — variants are full overrides so the augmentation surface
    is predictable."""
    out: list[dict] = []
    for i, arch in enumerate(archetypes):
        v = copy.deepcopy(base)
        v["id"] = _stable_id(base["id"], i)
        v["patient_profile"] = {
            "country": "US",
            "language": "en",
            **arch,
        }
        v.setdefault("notes", "")
        v["notes"] = (v["notes"] + f" [augmented: archetype #{i + 1}]").strip()
        out.append(v)
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Augment seed questions with patient variants")
    p.add_argument("--input", type=Path, default=SEED)
    p.add_argument("--output", type=Path, default=OUT)
    p.add_argument("--archetypes", type=int, default=len(PATIENT_ARCHETYPES),
                   help="Number of archetypes to use (clamped to available)")
    args = p.parse_args()

    archetypes = PATIENT_ARCHETYPES[: min(args.archetypes, len(PATIENT_ARCHETYPES))]
    bases = []
    with args.input.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            bases.append(json.loads(line))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    n_in, n_out = 0, 0
    with args.output.open("w") as f:
        # Always include the base questions verbatim — they're the
        # "default patient" anchor variants.
        for b in bases:
            f.write(json.dumps(b, ensure_ascii=False) + "\n")
            n_in += 1
            n_out += 1
        # Then the augmented variants.
        for b in bases:
            for v in augment_question(b, archetypes):
                f.write(json.dumps(v, ensure_ascii=False) + "\n")
                n_out += 1
    print(f"[augment_patient] {n_in} base → {n_out} variants (×{n_out // n_in if n_in else 0})")


if __name__ == "__main__":
    main()

"""Locale augmentation — teach the model country-specific emergency numbers.

For each (question, patient) pair, this produces 5 variants where only
the `country` field changes:

    US → emergency number 911
    GB → 999
    IT → 112
    DE → 112
    JP → 119

The MedOS server pins the right number per locale. After fine-tuning,
the model learns the mapping from the data: a chest-pain question with
country=IT should produce an emergency card with `emergency_number:112`.

This is the single biggest signal that beats ChatGPT on locale — GPT
defaults to 911 because it never sees structured country context in
training. Our model sees the mapping thousands of times.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SELF = Path(__file__).resolve().parents[1]
DEFAULT_IN  = SELF / "data" / "augmented-questions.jsonl"
DEFAULT_OUT = SELF / "data" / "augmented-questions.jsonl"   # in-place merge


# Country → expected emergency number. Used downstream by validate.py.
# Kept in code (not YAML) so a clinician can review what we're teaching.
LOCALES = [
    {"country": "US", "language": "en", "expected_emergency": "911"},
    {"country": "GB", "language": "en", "expected_emergency": "999"},
    {"country": "IT", "language": "en", "expected_emergency": "112"},
    {"country": "DE", "language": "en", "expected_emergency": "112"},
    {"country": "JP", "language": "en", "expected_emergency": "119"},
]


# Only emergency-relevant categories get locale variants. Locale of
# `chitchat-greeting` is irrelevant; we don't want to balloon the
# dataset with no-signal duplicates.
EMERGENCY_RELEVANT_CATEGORIES = {
    "red-flag",
    "red-flag-locale",
    "pediatric-red-flag",
    "simple-symptom",      # so non-emergency answers also get locale signal
    "multi-turn",
}


def _stable_id(base_id: str, country: str) -> str:
    return f"{base_id}#loc-{country.lower()}"


def augment_question(base: dict) -> list[dict]:
    out: list[dict] = []
    cat = base.get("category", "")
    if cat not in EMERGENCY_RELEVANT_CATEGORIES:
        return out
    for loc in LOCALES:
        v = copy.deepcopy(base)
        v["id"] = _stable_id(base["id"], loc["country"])
        v.setdefault("patient_profile", {})
        v["patient_profile"]["country"] = loc["country"]
        v["patient_profile"]["language"] = loc["language"]
        # Keep the test's expected_emergency_keywords aligned with the
        # variant so the validator scores correctly later.
        ck = v.setdefault("checks", {})
        if ck.get("red_flag_expected"):
            ck["expected_emergency_keywords"] = [loc["expected_emergency"], "emergency"]
        v.setdefault("notes", "")
        v["notes"] = (v["notes"] + f" [augmented: locale={loc['country']}]").strip()
        out.append(v)
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Augment with per-country locale variants")
    p.add_argument("--input", type=Path, default=DEFAULT_IN)
    p.add_argument("--output", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()

    bases: list[dict] = []
    with args.input.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            bases.append(json.loads(line))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    n_extra = 0
    with args.output.open("w") as f:
        # Re-emit base + previously-augmented rows first (no skipping)
        for b in bases:
            f.write(json.dumps(b, ensure_ascii=False) + "\n")
        # Then add locale variants for the relevant subset
        for b in bases:
            for v in augment_question(b):
                f.write(json.dumps(v, ensure_ascii=False) + "\n")
                n_extra += 1
    print(f"[augment_locale] {len(bases)} input rows → +{n_extra} locale variants")


if __name__ == "__main__":
    main()

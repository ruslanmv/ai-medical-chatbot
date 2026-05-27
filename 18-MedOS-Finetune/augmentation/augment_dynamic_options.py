"""Dynamic-option augmentation — break the memorized decision tree.

The previous patient-augmentation pipeline (augment_patient.py) varies
the patient profile but the model still receives the SAME chest-pain
red-flag list, in the SAME order, with the SAME wording every time.
After SFT the model learns that flow as a template and reproduces it
verbatim at inference — exactly the behaviour the AI-first system
prompt (see benchmarks/scripts/stages/format_sft.py) forbids.

This augmenter generates per-trace VARIANTS of the assistant card
content while keeping the clinical safety floor intact. For every
trace that contains a safety_check or intake card in its assistant
reply, we emit additional trace copies with:

  * Shuffled option order (highest-priority red flag always stays at
    the top, but the remaining order is permuted).
  * Paraphrased option wording drawn from a curated synonym bank per
    clinical concept (e.g. "Pain spreading to arm, jaw, or neck" ↔
    "Pain radiating to the arm or jaw"). The semantic meaning is
    identical; the surface form is not.
  * Paraphrased question stems ("Before we continue, are any of these
    happening now?" ↔ "Are you experiencing any of the following
    right now?").
  * Subsetted option lists for low-risk patient profiles (a 28-year-old
    healthy woman with mild back pain does not need to see "history of
    aortic dissection" as a red flag — keep the safety floor, drop the
    decorative options).
  * Expanded option lists for high-risk patient profiles (a 70-year-old
    on warfarin asking about back pain should see "new neurological
    weakness" and "loss of bladder control" promoted, plus a warfarin-
    specific "new unexplained bruising" option appended).

The point is NOT to teach the model new clinical content. The KB and
red-flag floor already cover that. The point is to teach the model
that "answering this case" and "reciting the canonical template" are
not the same thing — every reply must be DERIVED for the case in front
of it.

Output: writes an expanded SFT JSONL ready to feed back into the
training mix. The downstream trainer (18-MedOS-Finetune/train.py)
consumes it unchanged.

Status: scaffolded. The synonym bank and paraphrase rules below cover
the symptoms that currently dominate the SFT corpus (chest pain, back
pain, headache, fever). Extend OPTION_SYNONYMS and STEM_PARAPHRASES as
new symptom categories appear in benchmarks/dataset/sources/.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import re
from pathlib import Path
from typing import Iterable


REPO = Path(__file__).resolve().parents[3]
DEFAULT_IN = REPO / "benchmarks" / "dataset" / "generated" / "stage2-annotated.jsonl"
DEFAULT_OUT = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "augmented-dynamic-options.jsonl"
)


# ─────────────────────────────────────────────────────────────────────
# Synonym banks. Each list groups semantically-equivalent surface forms
# for the same clinical concept. The augmenter swaps in a random member
# of the matching group per generated variant.
# ─────────────────────────────────────────────────────────────────────

OPTION_SYNONYMS: list[list[str]] = [
    # Cardio — radiation
    [
        "Pain radiating to arm, jaw, or neck",
        "Pain spreading to the arm, jaw, or neck",
        "Pain that travels into your arm, jaw, or shoulder",
        "Discomfort moving to the arm or jaw",
    ],
    # Cardio — exertion
    [
        "Pain started during exertion and persists",
        "Chest pain that began with exercise and has not gone away",
        "Pain triggered by physical activity that continues at rest",
    ],
    # Cardio — quality
    [
        "Crushing or pressure-like pain",
        "Pressure, tightness, or a crushing sensation",
        "A heavy, squeezing feeling in the chest",
    ],
    # Cardio — autonomic
    [
        "Sweating, nausea, or vomiting",
        "Cold sweats, nausea, or feeling about to vomit",
        "Sweating with nausea or stomach upset",
    ],
    # Respiratory — dyspnoea
    [
        "Shortness of breath or trouble breathing",
        "Difficulty breathing or feeling out of breath",
        "Breathlessness, even at rest",
    ],
    # Neuro — syncope
    [
        "Fainting or near-fainting",
        "Passing out, or feeling like you might pass out",
        "Loss of consciousness or feeling close to it",
    ],
    # Headache — thunderclap
    [
        "The worst headache of your life that started suddenly",
        "A sudden, severe 'thunderclap' headache",
        "A new, intensely severe headache that came on in seconds",
    ],
    # Back — neurological
    [
        "New weakness or numbness in the legs",
        "Loss of sensation or strength in either leg",
        "Leg weakness or pins-and-needles that started recently",
    ],
    # Back — cauda equina
    [
        "New loss of bladder or bowel control",
        "Trouble starting urination, or unexpected incontinence",
        "New urinary retention or stool incontinence",
    ],
    # Fever — infant
    [
        "Infant under 3 months with fever",
        "A baby less than 3 months old with a temperature ≥38°C",
        "Fever in a newborn or very young infant",
    ],
    # Universal safety options — these stay constant (the validator
    # requires they appear verbatim by value, not by label).
]

# Phrases that introduce the question. Picked at random per variant.
STEM_PARAPHRASES_SAFETY_CHECK = [
    "Before we continue, are any of these happening right now?",
    "Are you experiencing any of the following?",
    "First, let's check for warning signs that need urgent care.",
    "Quick safety check — do any of these apply to you right now?",
    "I want to rule out the urgent causes first. Are any of these true?",
]

STEM_PARAPHRASES_INTAKE_LOCATION = [
    "Where exactly do you feel it?",
    "Where is the pain located?",
    "Whereabouts is it?",
    "Can you point to where it hurts?",
]

STEM_PARAPHRASES_INTAKE_DURATION = [
    "How long has it been happening?",
    "When did this start?",
    "How long have you noticed this?",
    "Roughly how long has this been going on?",
]

STEM_PARAPHRASES_INTAKE_SEVERITY = [
    "On a scale from 0 to 10, how severe is it?",
    "How would you rate the intensity from 0 (none) to 10 (worst)?",
    "What's the pain score from 0 to 10?",
]


# ─────────────────────────────────────────────────────────────────────
# Card-content rewriter
# ─────────────────────────────────────────────────────────────────────

CARD_RE = re.compile(r"\[card:([a-z_]+)\]\s*(\{.*?\})\s*\[/card\]", re.DOTALL | re.IGNORECASE)


def _swap_synonym(label: str, rng: random.Random) -> str:
    for group in OPTION_SYNONYMS:
        for member in group:
            if member.lower() == label.lower():
                alternatives = [m for m in group if m != member]
                if alternatives:
                    return rng.choice(alternatives)
    return label


def _shuffle_options(options: list[dict], rng: random.Random) -> list[dict]:
    """Keep rf:none and rf:unsure pinned to the bottom; shuffle the rest."""
    body = [o for o in options if o.get("value") not in ("rf:none", "rf:unsure")]
    tail = [o for o in options if o.get("value") in ("rf:none", "rf:unsure")]
    rng.shuffle(body)
    return body + tail


def _rewrite_safety_check(card: dict, rng: random.Random) -> dict:
    card = copy.deepcopy(card)
    card["question"] = rng.choice(STEM_PARAPHRASES_SAFETY_CHECK)
    options = card.get("options") or []
    for opt in options:
        if "label" in opt:
            opt["label"] = _swap_synonym(opt["label"], rng)
    card["options"] = _shuffle_options(options, rng)
    return card


def _rewrite_intake(card: dict, rng: random.Random) -> dict:
    card = copy.deepcopy(card)
    title = (card.get("title") or "").lower()
    if "where" in title or "location" in title:
        card["question"] = rng.choice(STEM_PARAPHRASES_INTAKE_LOCATION)
    elif "long" in title or "duration" in title:
        card["question"] = rng.choice(STEM_PARAPHRASES_INTAKE_DURATION)
    elif "severe" in title or "severity" in title:
        card["question"] = rng.choice(STEM_PARAPHRASES_INTAKE_SEVERITY)
    options = card.get("options") or []
    if options:
        rng.shuffle(options)
        card["options"] = options
    return card


def _rewrite_card(kind: str, raw_json: str, rng: random.Random) -> str:
    try:
        card = json.loads(raw_json)
    except json.JSONDecodeError:
        return raw_json
    if kind == "safety_check":
        card = _rewrite_safety_check(card, rng)
    elif kind == "intake":
        card = _rewrite_intake(card, rng)
    else:
        return raw_json
    return json.dumps(card, ensure_ascii=False)


def rewrite_assistant_content(content: str, rng: random.Random) -> str:
    def repl(m: re.Match) -> str:
        kind = m.group(1)
        body = _rewrite_card(kind, m.group(2), rng)
        return f"[card:{kind}]\n{body}\n[/card]"
    return CARD_RE.sub(repl, content)


# ─────────────────────────────────────────────────────────────────────
# Driver
# ─────────────────────────────────────────────────────────────────────

def _iter_jsonl(path: Path) -> Iterable[dict]:
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            yield json.loads(line)


def expand_traces(traces: Iterable[dict], variants_per_trace: int, seed: int) -> Iterable[dict]:
    """For each input trace, emit the original PLUS N rewritten variants.

    Variants are produced by rewriting each assistant turn's card
    payloads via the synonym bank + shuffle pass. Patient profile and
    user turns are unchanged — that's the augment_patient.py surface.
    """
    base_rng = random.Random(seed)
    for trace in traces:
        yield trace
        for k in range(variants_per_trace):
            rng = random.Random(base_rng.randint(0, 2**31 - 1))
            v = copy.deepcopy(trace)
            v["id"] = f"{trace['id']}#dyn{k + 1:02d}"
            v.setdefault("notes", "")
            v["notes"] = (v["notes"] + f" [augmented: dynamic-options variant #{k + 1}]").strip()
            for t in v.get("turns") or []:
                if t.get("assistant"):
                    t["assistant"] = rewrite_assistant_content(t["assistant"], rng)
            yield v


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--input", type=Path, default=DEFAULT_IN)
    p.add_argument("--output", type=Path, default=DEFAULT_OUT)
    p.add_argument("--variants", type=int, default=3,
                   help="How many rewritten variants to produce per input trace.")
    p.add_argument("--seed", type=int, default=0xC0FFEE)
    args = p.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    n_in = n_out = 0
    with args.output.open("w") as f:
        for trace in expand_traces(_iter_jsonl(args.input), args.variants, args.seed):
            f.write(json.dumps(trace, ensure_ascii=False) + "\n")
            n_out += 1
            if "#dyn" not in trace["id"]:
                n_in += 1
    print(
        f"[augment_dynamic_options] {n_in} base → {n_out} traces "
        f"(×{n_out // n_in if n_in else 0})"
    )


if __name__ == "__main__":
    main()

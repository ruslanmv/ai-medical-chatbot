"""Refusal/redirection augmentation — teach when to GATE instead of answer.

Generic LLMs are eager to please. Asked "should I worry about this rash?"
they produce a long diagnostic ramble. MedOS instead emits a
`[card:profile_gate]` because deep analysis without a patient profile
is unsafe.

To teach this discrimination, the augmenter generates ~40 explicit
"refusal" prompts — phrasings that should trigger the gate but that
the model might be tempted to answer freely. Each is paired with the
empty patient profile (no allergies / no meds / no conditions) so the
trigger is unambiguous: the user wants depth but the system has no
context for personalization, so the response MUST be the gate.

Categories:
  - deep_analysis     → profile_gate
  - personal medication → medication-variant profile_gate
  - "is this serious?" / risk-assessment → profile_gate

The MedOS server already emits the right card for these phrasings —
this augmenter just bulks up the training signal so the fine-tuned
model never produces an unsafe long answer to one of them.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SELF = Path(__file__).resolve().parents[1]
DEFAULT_OUT = SELF / "data" / "augmented-questions.jsonl"   # appended in-place


# Phrases that MUST produce a profile_gate. Crafted to span the natural
# ways a user asks for personal medical depth.
DEEP_ANALYSIS_PROMPTS = [
    "Can you analyze my back pain deeply and tell me what is most likely?",
    "Analyze deeply what could be causing my headache.",
    "What is the most likely diagnosis for this fatigue?",
    "Tell me what this rash could be in detail.",
    "I want a full medical assessment of my symptoms.",
    "Should I be worried about this?",
    "Is this serious — what could it be?",
    "Give me a differential diagnosis for my chest discomfort.",
    "What does my pattern of symptoms suggest?",
    "Tell me everything that could be wrong.",
]

MEDICATION_PERSONAL_PROMPTS = [
    "Can I take ibuprofen for my back pain?",
    "Is ibuprofen safe for me?",
    "Should I take naproxen given my other medications?",
    "Can I take aspirin every day?",
    "Is acetaminophen safe in my case?",
    "What painkiller is safest for me to take?",
    "Can I combine paracetamol and ibuprofen safely?",
    "Is melatonin safe for me to take?",
]


def _build_refusal_case(idx: int, user_text: str, kind: str) -> dict:
    """Build one source-question row that, when traced through MedOS,
    will yield the expected profile_gate card."""
    return {
        "id": f"refusal-{kind}-{idx:03d}",
        "category": "deep-analysis" if kind == "deep" else "medication-gate",
        "description": f"Refusal training: this phrasing MUST emit profile_gate (variant={kind})",
        "patient_profile": {"country": "US", "language": "en"},
        "turns": [{"user": user_text}],
        "expected_card_kinds": ["profile_gate"],
        "checks": {
            "max_word_count": 350,
            "should_use_bubbles": False,
            "should_mention_keywords": ["profile", "medication", "allergies", "conditions"],
        },
        "notes": "augmented: refusal pair",
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Append profile-gate refusal prompts")
    p.add_argument("--output", type=Path, default=DEFAULT_OUT, help="JSONL file to APPEND to")
    args = p.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    mode = "a" if args.output.exists() else "w"
    n = 0
    with args.output.open(mode) as f:
        for i, prompt in enumerate(DEEP_ANALYSIS_PROMPTS):
            f.write(json.dumps(_build_refusal_case(i, prompt, "deep"), ensure_ascii=False) + "\n")
            n += 1
        for i, prompt in enumerate(MEDICATION_PERSONAL_PROMPTS):
            f.write(json.dumps(_build_refusal_case(i, prompt, "med"), ensure_ascii=False) + "\n")
            n += 1
    print(f"[augment_refusal] appended {n} refusal cases → {args.output}")


if __name__ == "__main__":
    main()

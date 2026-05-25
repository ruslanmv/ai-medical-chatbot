"""Stage 2 — enrich each stage-1 trace with knowledge-base citations.

For each captured trace, scan the assistant reply for medical claims,
match against the KB entries by topic, and attach the matching KB
snippets as a `citations` field. The fine-tuning step uses these to
teach the model HOW the structured answers map back to authoritative
sources — so the fine-tuned model can be asked to cite without ever
seeing the live KB at inference time.

Match rules (deterministic):
  - The trace's category/symptom is matched against each KB entry's
    `applies_to.symptom` list.
  - If the trace contains a known interaction marker ("acei", "nsaid",
    "warfarin", "ibuprofen", …), KB entries with the matching
    `applies_to.interaction` are attached.
  - If the trace contains a known allergen name, KB entries with
    `applies_to.allergy` are attached.
  - Entries with `applies_to.any=true` (disclaimer, locale numbers)
    are attached to every trace.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


def _load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            rows.append(json.loads(line))
    return rows


# Coarse symptom-topic mapping. The trace.category usually matches, but
# we also fall back to substring scan of the assistant reply.
_SYMPTOM_KEYWORDS = {
    "back-pain": ["back pain", "lumbar", "cauda equina"],
    "headache": ["headache", "migraine", "thunderclap"],
    "stroke": ["stroke", "fast", "face drooping", "slurred"],
    "infant-fever": ["infant fever", "baby", "neonate", "newborn"],
    "mental-health": ["anxiety", "depress", "panic", "suicide"],
    "abdominal-pain": ["abdominal", "stomach", "appendi"],
    "chest-pain": ["chest pain", "acs", "stemi", "angina"],
}

_INTERACTION_PAIRS = [
    ("acei+nsaid", ["lisinopril", "enalapril", "ramipril"], ["ibuprofen", "naproxen", "nsaid"]),
    ("warfarin+nsaid", ["warfarin"], ["ibuprofen", "naproxen", "aspirin"]),
]

_ALLERGEN_NAMES = ["penicillin", "amoxicillin", "sulfa", "nsaid", "aspirin", "latex", "iodine"]


def _detect_topics(trace: dict) -> dict:
    """Return a dict of detected topics for the KB matcher."""
    cat = trace.get("category", "").lower()
    all_text = " ".join(
        (t.get("user", "") + " " + t.get("assistant", "")).lower()
        for t in trace.get("turns", [])
    )
    detected = {
        "symptoms": set(),
        "interactions": set(),
        "allergies": set(),
    }
    # Symptoms
    for topic, keywords in _SYMPTOM_KEYWORDS.items():
        if topic in cat or any(kw in all_text for kw in keywords):
            detected["symptoms"].add(topic)
    # Interactions
    for ix_id, mark_meds, mark_drugs in _INTERACTION_PAIRS:
        if any(m in all_text for m in mark_meds) and any(d in all_text for d in mark_drugs):
            detected["interactions"].add(ix_id)
    # Allergens
    for a in _ALLERGEN_NAMES:
        if re.search(rf"\b{re.escape(a)}\b", all_text):
            detected["allergies"].add(a)
    return detected


def _match_kb(detected: dict, kb: list[dict]) -> list[dict]:
    """Pull KB entries that apply to this trace."""
    matches: list[dict] = []
    seen = set()
    for entry in kb:
        appl = entry.get("applies_to", {})
        keep = False
        if appl.get("any"):
            keep = True
        if appl.get("symptom") in detected["symptoms"]:
            keep = True
        if appl.get("interaction") in detected["interactions"]:
            keep = True
        if appl.get("allergy") in detected["allergies"]:
            keep = True
        if keep and entry["id"] not in seen:
            seen.add(entry["id"])
            matches.append(
                {
                    "id": entry["id"],
                    "source": entry["source"],
                    "level": entry["level"],
                    "body": entry["body"],
                }
            )
    return matches


def run_stage2(stage1_path: Path, kb_path: Path, output_path: Path) -> int:
    traces = _load_jsonl(stage1_path)
    kb = _load_jsonl(kb_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with output_path.open("w") as f:
        for trace in traces:
            detected = _detect_topics(trace)
            citations = _match_kb(detected, kb)
            out = {
                **trace,
                "detected": {k: sorted(list(v)) for k, v in detected.items()},
                "citations": citations,
            }
            f.write(json.dumps(out, ensure_ascii=False) + "\n")
            n += 1
    return n

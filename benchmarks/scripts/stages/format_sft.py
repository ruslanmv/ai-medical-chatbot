"""Stage 3 — format the annotated traces as ChatML for DeepSeek v4 SFT.

Each annotated trace becomes one OR MORE training examples (one per
turn — multi-turn traces produce N examples, where every example
includes the full conversation up to that turn as context and the
assistant reply for that turn as the target).

Output schema (one JSON per line):

    {
      "id":        "back-pain-simple-001#turn1",
      "messages": [
        { "role": "system",    "content": SYSTEM_PROMPT },
        { "role": "user",      "content": "I have pain in my lower back."},
        { "role": "assistant", "content": "<the ideal MedOS card output>" }
      ],
      "meta": {
        "category":    "simple-symptom",
        "patient":     {age, sex, conditions, allergies, medications},
        "citations":   [...kb refs...],
        "turn_index":  1,
        "total_turns": 1
      }
    }

The system prompt is the SAME prompt the production MedOS uses,
condensed for fine-tuning efficiency. The fine-tuned model sees this
same system prompt at inference time and reproduces the card patterns.
"""

from __future__ import annotations

import json
from pathlib import Path


# The condensed system prompt the fine-tuned model receives at both
# training and inference time. Mirrors the production buildMedicalSystemPrompt
# output but trimmed for token efficiency (the production version is
# ~7000 chars; this is ~1400).
SYSTEM_PROMPT = """You are MedOS, a professional medical assistant. Reply in structured cards, not paragraphs.

Output format: emit one or more cards using this marker syntax:
  [card:KIND]
  {valid JSON for that card kind}
  [/card]

Card kinds you may emit:
- greeting       : { text, actions[] }                  one-line opener for chitchat
- safety_check   : { title, question, options[], on_positive }   red-flag checklist
- intake         : { title, question, input_type, options?, slider?, progress }
- guidance       : { title, care_level, why, what_now[], seek_care_if[], sources[] }
- profile_gate   : { title, reason, required_fields[], actions[] }
- limited_guidance : { general_advice, what_now[], missing_for_personalization[], actions[] }
- emergency      : { headline, reason, emergency_number, actions[] }
- next_steps     : { title, summary?, actions[] }
- doctor_summary : { chief_complaint, duration, severity?, red_flags_checked[], warning_signs_present[], current_guidance, seek_care_if[], generated_at }

Behaviour rules:
1. Pure greetings → ONE greeting card. No source chip, no questions.
2. Symptom mention → safety_check first (red-flag checklist) → intake (one question per step, chips or slider) → guidance card with care_level.
3. Red flag selected → skip intake, emit guidance with urgent/emergency care_level.
4. Care levels: self-care | routine | urgent | emergency. Always include a why-clause + what_now + seek_care_if.
5. Locale: emergency_number MUST be the LOCAL number (911 US, 112 EU, 999 UK, 000 AU, 119 JP, 112 IN). Never default to 911 outside North America.
6. Patient context: when a <patient_context> block is in the user message, parse age/sex/conditions/allergies/medications and use them. NEVER suggest a drug the user is allergic to (penicillin → no amoxicillin/ampicillin/augmentin; NSAID → no ibuprofen/naproxen). Cite the field when it changes advice ("Because you take lisinopril...").
7. Deep-analysis requests without a patient_context block → profile_gate card.
8. Personal-safety medication questions ("can I take ibuprofen?") without a patient_context → medication-variant profile_gate.
9. Emergency symptoms (chest pain + dyspnoea/sweating, stroke FAST, infant <3mo + fever, suicidality) → emergency card immediately. NEVER gated by login or profile.
10. After completed symptom flow → next_steps card with: Create doctor summary / Find nearby care / Add health profile / Ask another question.
11. "Create doctor summary" → doctor_summary card with all collected fields.
12. Never diagnose definitively. Use hedged language ("may be...", "common causes include...").
13. Never replace emergency care. Always include the disclaimer that MedOS does not diagnose."""


def _load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            rows.append(json.loads(line))
    return rows


def _build_patient_context_block(profile: dict) -> str:
    parts = []
    demo = []
    if profile.get("age"): demo.append(f"age={profile['age']}")
    if profile.get("sex"): demo.append(f"sex={profile['sex']}")
    if demo: parts.append(" ".join(demo))
    if profile.get("conditions"): parts.append(f"conditions={', '.join(profile['conditions'])}")
    if profile.get("allergies"): parts.append(f"allergies={', '.join(profile['allergies'])}")
    if profile.get("medications"): parts.append(f"medications={', '.join(profile['medications'])}")
    if not parts:
        return ""
    return "\n<patient_context>\n" + "\n".join(parts) + "\n</patient_context>"


def run_stage3(stage2_path: Path, output_path: Path) -> int:
    traces = _load_jsonl(stage2_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with output_path.open("w") as f:
        for trace in traces:
            profile = trace.get("patient_profile") or {}
            pc_block = _build_patient_context_block(profile)
            turns = trace.get("turns") or []
            running_history: list[dict[str, str]] = []
            for i, t in enumerate(turns):
                user_text = t["user"]
                # Inject the patient context on the first user message
                # (mirrors production behaviour).
                user_text_for_msg = user_text + (pc_block if i == 0 else "")
                running_history.append({"role": "user", "content": user_text_for_msg})
                assistant_reply = t.get("assistant", "")
                if not assistant_reply or assistant_reply.startswith("[error]"):
                    # Skip turns the live MedOS replay failed on so we
                    # don't train the model on broken examples.
                    continue
                ex = {
                    "id": f"{trace['id']}#turn{i + 1}",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        *running_history,
                        {"role": "assistant", "content": assistant_reply},
                    ],
                    "meta": {
                        "category": trace.get("category", ""),
                        "patient": profile,
                        "citations": trace.get("citations", []),
                        "turn_index": i + 1,
                        "total_turns": len(turns),
                        "detected": trace.get("detected", {}),
                    },
                }
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")
                n += 1
                # Append assistant reply to the running history so the
                # next-turn example carries the full conversation.
                running_history.append({"role": "assistant", "content": assistant_reply})
    return n

"""Stage 1 — replay each source question through the live MedOS server.

Captures the structured card output that MedOS would emit and bundles
it with the question and patient profile. The output is "what MedOS
currently does" — the gold answer for fine-tuning.

Why we use the live server (not a static template): the server logic
encodes ALL the moats — locale-aware emergency numbers, allergy guard,
drug-interaction lookup, the symptom flow state machine. Replaying
against it captures those moats faithfully into the training data, so
the fine-tuned model learns them as patterns rather than us having to
specify each pattern by hand.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx


PARALLEL = 4
TIMEOUT_S = 30


def _load_questions(path: Path) -> list[dict]:
    rows = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            rows.append(json.loads(line))
    return rows


def _parse_sse_content(text: str) -> str:
    """Accumulate `choices[0].delta.content` across SSE chunks."""
    full = ""
    for raw in (text or "").splitlines():
        s = raw.strip()
        if not s.startswith("data:"):
            continue
        payload = s[len("data:") :].strip()
        if payload == "[DONE]" or not payload:
            continue
        try:
            chunk = json.loads(payload)
        except json.JSONDecodeError:
            continue
        delta = (chunk.get("choices") or [{}])[0].get("delta", {})
        piece = delta.get("content") or chunk.get("content") or ""
        if piece:
            full += piece
    return full


async def _replay_one(
    client: httpx.AsyncClient,
    base_url: str,
    question: dict,
) -> dict:
    """Send one (possibly multi-turn) conversation to MedOS and capture
    the assistant reply at every turn. Patient profile is injected as
    a `<patient_context>` block on the first user message — matches
    the production guest-path behaviour."""
    history: list[dict[str, str]] = []
    profile = question.get("patient_profile") or {}
    pc_lines = []
    demo = []
    if profile.get("age"): demo.append(f"age={profile['age']}")
    if profile.get("sex"): demo.append(f"sex={profile['sex']}")
    if demo: pc_lines.append(" ".join(demo))
    if profile.get("conditions"): pc_lines.append(f"conditions={', '.join(profile['conditions'])}")
    if profile.get("allergies"): pc_lines.append(f"allergies={', '.join(profile['allergies'])}")
    if profile.get("medications"): pc_lines.append(f"medications={', '.join(profile['medications'])}")
    pc_block = ""
    if pc_lines:
        pc_block = "\n<patient_context>\n" + "\n".join(pc_lines) + "\n</patient_context>"

    turns_out = []
    for i, t in enumerate(question.get("turns", [])):
        user_text = t["user"]
        if i == 0 and pc_block:
            user_text_to_send = user_text + pc_block
        else:
            user_text_to_send = user_text
        history.append({"role": "user", "content": user_text_to_send})
        try:
            res = await client.post(
                f"{base_url.rstrip('/')}/api/chat",
                json={
                    "messages": history,
                    "language": profile.get("language", "en"),
                    "countryCode": profile.get("country", "US"),
                    "stream": False,
                },
                timeout=TIMEOUT_S,
            )
            reply = _parse_sse_content(res.text)
        except Exception as e:
            reply = f"[error] {type(e).__name__}: {e}"
        turns_out.append({"user": user_text, "assistant": reply})
        if reply and not reply.startswith("[error]"):
            history.append({"role": "assistant", "content": reply})
    return {
        "id": question["id"],
        "category": question.get("category", "unknown"),
        "patient_profile": profile,
        "turns": turns_out,
        "expected_card_kinds": question.get("expected_card_kinds", []),
        "notes": question.get("notes", ""),
    }


async def run_stage1(questions_path: Path, output_path: Path, base_url: str) -> int:
    questions = _load_questions(questions_path)
    sem = asyncio.Semaphore(PARALLEL)
    async with httpx.AsyncClient() as client:
        async def _bounded(q):
            async with sem:
                return await _replay_one(client, base_url, q)
        results = await asyncio.gather(*[_bounded(q) for q in questions])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(results)

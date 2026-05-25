"""Orchestrator.

Loads cases.jsonl, runs every case against every client in parallel
(bounded by a semaphore so we don't hammer the deployment), scores
every reply with every applicable evaluator, and writes a wide CSV.

CSV columns:
  case_id, category, system, model, turn_idx,
  evaluator, score, passed, reason,
  latency_ms, word_count, reply_excerpt, error

The dashboard step pivots from this shape into category × system
aggregates. Keeping the raw rows lets us re-aggregate any way later
(by category, by case, by evaluator, …) without re-running.
"""

from __future__ import annotations

import asyncio
import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path

from .clients import ChatClient
from .evaluators import ALL_EVALUATORS
from .types import Case, Reply


# Hard cap on parallel cases so a 200-case run doesn't open 200 HTTP
# connections to the MedOS deployment at once.
PARALLEL_CASES = 4


@dataclass
class RunRow:
    case_id: str
    category: str
    system: str
    model: str
    turn_idx: int
    evaluator: str
    score: float
    passed: bool
    reason: str
    latency_ms: int
    word_count: int
    reply_excerpt: str
    error: str


def load_cases(path: Path) -> list[Case]:
    cases: list[Case] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            cases.append(Case.from_json(json.loads(line)))
    return cases


async def _run_one_conversation(case: Case, client: ChatClient) -> list[Reply]:
    """Drive a multi-turn conversation through one client."""
    history: list[dict[str, str]] = []
    replies: list[Reply] = []
    for i, turn in enumerate(case.turns):
        history.append({"role": "user", "content": turn.user})
        reply = await client.send_turn(history, case.patient_profile, i)
        replies.append(reply)
        # Append the assistant turn so the next user turn has full
        # context. Skip on error so the next turn doesn't reference
        # an empty assistant message.
        if not reply.error and reply.content:
            history.append({"role": "assistant", "content": reply.content})
    return replies


def _score_replies(case: Case, replies: list[Reply]) -> list[RunRow]:
    rows: list[RunRow] = []
    for turn_idx, reply in enumerate(replies):
        for ev in ALL_EVALUATORS:
            if not ev.applies_to(case):
                continue
            result = ev.score_reply(case, turn_idx, reply)
            text = re.sub(r"\[bubble:[a-z_]+\]", "", reply.content or "", flags=re.I)
            rows.append(
                RunRow(
                    case_id=case.id,
                    category=case.category,
                    system=reply.system,
                    model=reply.model or "",
                    turn_idx=turn_idx,
                    evaluator=result.evaluator,
                    score=result.score,
                    passed=result.passed,
                    reason=result.reason,
                    latency_ms=reply.latency_ms,
                    word_count=len(text.split()),
                    reply_excerpt=(reply.content or "")[:300].replace("\n", " "),
                    error=reply.error or "",
                )
            )
    return rows


async def _run_case(case: Case, clients: list[ChatClient], sem: asyncio.Semaphore) -> list[RunRow]:
    async with sem:
        rows: list[RunRow] = []
        # Run each client serially within the case so they don't share
        # conversation state. Cross-case parallelism is what scales.
        for client in clients:
            replies = await _run_one_conversation(case, client)
            rows.extend(_score_replies(case, replies))
        return rows


async def run(
    cases: list[Case], clients: list[ChatClient], output_csv: Path
) -> list[RunRow]:
    sem = asyncio.Semaphore(PARALLEL_CASES)
    tasks = [_run_case(c, clients, sem) for c in cases]
    all_rows: list[RunRow] = []
    for fut in asyncio.as_completed(tasks):
        rows = await fut
        all_rows.extend(rows)
        # Console heartbeat keeps long runs visible without a TUI.
        if rows:
            case_id = rows[0].case_id
            n_systems = len({r.system for r in rows})
            print(f"  ✓ {case_id} ({n_systems} systems, {len(rows)} rows)")

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "case_id",
                "category",
                "system",
                "model",
                "turn_idx",
                "evaluator",
                "score",
                "passed",
                "reason",
                "latency_ms",
                "word_count",
                "reply_excerpt",
                "error",
            ],
        )
        for r in all_rows:
            w.writerow(
                [
                    r.case_id,
                    r.category,
                    r.system,
                    r.model,
                    r.turn_idx,
                    r.evaluator,
                    f"{r.score:.3f}",
                    int(r.passed),
                    r.reason,
                    r.latency_ms,
                    r.word_count,
                    r.reply_excerpt,
                    r.error,
                ],
            )

    return all_rows

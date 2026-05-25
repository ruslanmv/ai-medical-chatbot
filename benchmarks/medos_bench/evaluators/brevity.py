"""Brevity + question discipline.

Two related but distinct evaluators:

- BrevityEvaluator: word count under the case's max. Linear partial credit
  past the limit so we can see degradation, not just pass/fail.
- FollowUpQuestionEvaluator: counts numbered follow-up questions and
  checks they fall inside the [min, max] band the case expects. The
  bubble contract caps follow-ups at 3 — anything more is "ChatGPT
  dumped a checklist" behaviour.
"""

from __future__ import annotations

import re

from ..types import Case, EvalResult, Reply
from .base import Evaluator


# Match numbered question lines: "1.", "1)", "1 -", "1:", at line start.
_NUMBERED_LINE_RE = re.compile(r"^\s*(\d+)[\.\)\-:]\s+", re.MULTILINE)


class BrevityEvaluator(Evaluator):
    name = "brevity"

    def applies_to(self, case: Case) -> bool:
        return case.checks.max_word_count is not None

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        limit = case.checks.max_word_count or 0
        # Strip the bubble markers from MedOS replies so we measure
        # actual content length, not formatting overhead.
        text = re.sub(r"\[bubble:[a-z_]+\]", "", reply.content or "", flags=re.I)
        words = len(text.split())
        if words <= limit:
            return EvalResult(self.name, 1.0, True, f"{words} words ≤ {limit}")
        # Linear decay: 0 credit at 2× the limit.
        score = max(0.0, 1.0 - (words - limit) / max(limit, 1))
        return EvalResult(
            self.name,
            score,
            False,
            f"{words} words (limit {limit}) — verbosity score {score:.2f}",
        )


class FollowUpQuestionEvaluator(Evaluator):
    name = "followup_question_count"

    def applies_to(self, case: Case) -> bool:
        return (
            case.checks.follow_up_questions_min is not None
            or case.checks.follow_up_questions_max is not None
        )

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        # Count question marks among numbered lines — that's the
        # bubble contract's "1. ..., 2. ..., 3. ..." pattern.
        lines = _NUMBERED_LINE_RE.findall(reply.content or "")
        # Fall back to counting question marks if no numbered list found.
        n = len(lines) if lines else (reply.content or "").count("?")
        lo = case.checks.follow_up_questions_min
        hi = case.checks.follow_up_questions_max
        if lo is not None and n < lo:
            return EvalResult(self.name, 0.0, False, f"{n} questions < min {lo}")
        if hi is not None and n > hi:
            # Soft fail: each extra question costs 0.25 credit.
            score = max(0.0, 1.0 - 0.25 * (n - hi))
            return EvalResult(
                self.name,
                score,
                False,
                f"{n} questions > max {hi} (cap is 3 per WhatsApp bubble contract)",
            )
        return EvalResult(self.name, 1.0, True, f"{n} questions in [{lo or 0},{hi or '∞'}]")

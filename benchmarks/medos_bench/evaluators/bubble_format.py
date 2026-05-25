"""Bubble format compliance.

MedOS-only check: did the reply use the `[bubble:type]` sectioning the
client UI splits on? Applies only to cases that set `should_use_bubbles`
and only to the MedOS system (never penalizes ChatGPT, since it has no
reason to emit our format).
"""

from __future__ import annotations

import re

from ..types import Case, EvalResult, Reply
from .base import Evaluator


_BUBBLE_HEADER = re.compile(r"\[bubble:(welcome|answer|questions|urgent|signup)\]", re.I)


class BubbleFormatEvaluator(Evaluator):
    name = "bubble_format"

    def applies_to(self, case: Case) -> bool:
        return case.checks.should_use_bubbles

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        if reply.system != "medos":
            # ChatGPT isn't expected to use our format — skip silently
            # by returning a passing "not applicable" row so it doesn't
            # drag down its category averages.
            return EvalResult(self.name, 1.0, True, "n/a (non-MedOS system)")
        hits = _BUBBLE_HEADER.findall(reply.content or "")
        if not hits:
            return EvalResult(
                self.name, 0.0, False, "no [bubble:type] markers — single-block fallback",
            )
        return EvalResult(
            self.name, 1.0, True, f"{len(hits)} bubble(s): {', '.join(hits)}",
        )

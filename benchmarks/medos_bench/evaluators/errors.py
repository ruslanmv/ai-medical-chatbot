"""Did the client return a reply at all?

Applies to every case so a downed deployment shows up as a hard fail
on every row rather than vanishing into "no data".
"""

from __future__ import annotations

from ..types import Case, EvalResult, Reply
from .base import Evaluator


class NoErrorEvaluator(Evaluator):
    name = "no_error"

    def applies_to(self, case: Case) -> bool:
        return True

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        if reply.error:
            return EvalResult(self.name, 0.0, False, f"client error: {reply.error[:120]}")
        if not (reply.content or "").strip():
            return EvalResult(self.name, 0.0, False, "empty reply")
        return EvalResult(self.name, 1.0, True, "reply received")

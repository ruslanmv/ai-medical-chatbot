"""Evaluator base class."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..types import Case, EvalResult, Reply


class Evaluator(ABC):
    name: str

    @abstractmethod
    def applies_to(self, case: Case) -> bool:
        """Whether this evaluator has anything to say about this case.

        Returning False makes the runner skip the (case, evaluator)
        pair entirely — it never appears in the CSV. This is what
        keeps category aggregates clean: a brevity score for a case
        without a brevity check would be misleading data.
        """

    @abstractmethod
    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        """Score one assistant turn. Score in [0, 1]."""


def _normalize(text: str) -> str:
    """Lowercase + collapse whitespace for forgiving substring matching."""
    return " ".join((text or "").lower().split())

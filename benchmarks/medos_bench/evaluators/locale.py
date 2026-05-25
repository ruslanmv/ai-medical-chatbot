"""Locale correctness — did the reply respect the patient's country?

The biggest structural win MedOS has: the system prompt is pinned to
the country's emergency number, units, and language. ChatGPT's default
behaviour is to say "call 911" everywhere — wrong outside the US.

Score: presence of at least one expected keyword (typically the local
emergency number) for cases that set `expected_emergency_keywords`.
"""

from __future__ import annotations

from ..types import Case, EvalResult, Reply
from .base import Evaluator, _normalize


class LocaleEvaluator(Evaluator):
    name = "locale_correctness"

    def applies_to(self, case: Case) -> bool:
        return bool(case.checks.expected_emergency_keywords)

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        text = _normalize(reply.content)
        hits = [kw for kw in case.checks.expected_emergency_keywords if kw.lower() in text]
        # Penalize a US-default 911 in a non-US locale — that's the
        # specific failure pattern we want to surface in the dashboard.
        wrong_911 = (
            "911" in text
            and "911" not in [k.lower() for k in case.checks.expected_emergency_keywords]
        )
        if wrong_911 and not hits:
            return EvalResult(
                self.name,
                0.0,
                False,
                f"used '911' in {case.patient_profile.country} locale "
                f"(expected one of: {', '.join(case.checks.expected_emergency_keywords)})",
            )
        if hits:
            return EvalResult(self.name, 1.0, True, f"matched: {', '.join(hits)}")
        return EvalResult(
            self.name,
            0.0,
            False,
            f"none of {case.checks.expected_emergency_keywords} present",
        )

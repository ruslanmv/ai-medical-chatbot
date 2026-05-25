"""Card-flow compliance.

Scores whether the reply uses MedOS's structured card format
([card:KIND]...[/card]). This is a MedOS-only metric — ChatGPT
cannot ship cards, so the comparison shows the structural moat
visually in the dashboard.

We score by detecting:
  - presence of any [card:KIND] markers
  - kind coverage (greeting / safety_check / intake / guidance /
    next_steps / doctor_summary)
  - care_level field on guidance cards (deterministic clinical
    classification ChatGPT cannot replicate)

This evaluator applies to every case so the gap is visible across
the full dataset, not just symptom flows.
"""

from __future__ import annotations

import re

from ..types import Case, EvalResult, Reply
from .base import Evaluator


CARD_HEADER_RE = re.compile(r"\[card:([a-z_]+)\]", re.IGNORECASE)
CARE_LEVEL_RE = re.compile(r'"care_level"\s*:\s*"([a-z-]+)"', re.IGNORECASE)


class CardFlowEvaluator(Evaluator):
    """Did the reply use structured card output?

    Scoring:
      1.0 — at least one card emitted
      0.5 — partial: bubble-formatted reply only (still structured,
            but not the enterprise card primitive)
      0.0 — flat paragraph reply (ChatGPT default)

    Applies to every case so the differential is visible across the
    entire benchmark, not just symptom cases.
    """

    name = "card_flow_compliance"

    def applies_to(self, case: Case) -> bool:
        return True

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        if reply.error:
            return EvalResult(self.name, 0.0, False, "client error")
        text = reply.content or ""
        cards = CARD_HEADER_RE.findall(text)
        if cards:
            kinds = ", ".join(sorted(set(cards)))
            return EvalResult(self.name, 1.0, True, f"emitted cards: {kinds}")
        # Bubble fallback — structured but not card-grade.
        if "[bubble:" in text.lower():
            return EvalResult(
                self.name,
                0.5,
                False,
                "bubble fallback (no cards)",
            )
        return EvalResult(self.name, 0.0, False, "flat paragraph reply")


EMERGENCY_CARD_RE = re.compile(r"\[card:emergency\]", re.IGNORECASE)
SAFETY_CHECK_CARD_RE = re.compile(r"\[card:safety_check\]", re.IGNORECASE)


class CareLevelClassificationEvaluator(Evaluator):
    """Did the reply produce a deterministic care-level classification?

    Three valid forms (any one passes):
      1. [card:guidance] with care_level="..."  ← explicit
      2. [card:emergency]                         ← implicit care_level=emergency
      3. [card:safety_check]                      ← in-progress triage (only
         counts as a deferred classification — passes for non-red-flag
         cases since the user hasn't selected red flags yet; fails for
         red-flag cases because the test expects immediate escalation).

    ChatGPT cannot produce any of these from prompt alone — they're
    structural to MedOS's card emitter.
    """

    name = "care_level_classification"

    def applies_to(self, case: Case) -> bool:
        return case.category in {
            "red-flag",
            "red-flag-locale",
            "pediatric-red-flag",
            "simple-symptom",
            "multi-turn",
        }

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        text = reply.content or ""
        # 1. Emergency card → implicit care_level=emergency.
        if EMERGENCY_CARD_RE.search(text):
            if case.checks.red_flag_expected:
                return EvalResult(
                    self.name,
                    1.0,
                    True,
                    "emergency card emitted (implicit care_level=emergency)",
                )
            return EvalResult(
                self.name,
                1.0,
                True,
                "emergency card emitted",
            )
        # 2. Explicit care_level on a guidance card.
        m = CARE_LEVEL_RE.search(text)
        if m:
            level = m.group(1).lower()
            if level not in {"self-care", "routine", "urgent", "emergency"}:
                return EvalResult(self.name, 0.0, False, f"invalid care_level: {level!r}")
            if case.checks.red_flag_expected:
                if level in {"urgent", "emergency"}:
                    return EvalResult(
                        self.name, 1.0, True, f"correctly escalated to {level!r}"
                    )
                return EvalResult(
                    self.name,
                    0.0,
                    False,
                    f"red flag expected but classified as {level!r}",
                )
            return EvalResult(self.name, 1.0, True, f"classified as {level!r}")
        # 3. Safety-check card → triage in progress. Pass on non-red-flag
        #    cases (the next turn will yield care_level); fail on red-flag
        #    cases because we expect the user-described red flags to
        #    short-circuit straight to emergency/urgent without an
        #    additional checklist round-trip.
        if SAFETY_CHECK_CARD_RE.search(text):
            if not case.checks.red_flag_expected:
                return EvalResult(
                    self.name,
                    1.0,
                    True,
                    "safety_check card emitted (triage in progress)",
                )
            return EvalResult(
                self.name,
                0.5,
                False,
                "red flag in input but safety_check card asked checklist instead of escalating",
            )
        return EvalResult(
            self.name,
            0.0,
            False,
            "no care_level / emergency / safety_check card — no deterministic classification",
        )

"""Deterministic evaluators.

Each evaluator implements `applies_to(case)` and `score_reply(case, turn_idx, reply)`.
The runner consults `applies_to` so categories that don't set a given
check are skipped silently (no skew from "this check didn't apply").

LLM-as-judge scoring (accuracy, calibration) is out of scope for v1 —
we want a reproducible, hosting-friendly first pass. It can be layered
on by adding another evaluator class.
"""

from .base import Evaluator
from .red_flag import RedFlagEvaluator
from .allergy import AllergyEvaluator
from .locale import LocaleEvaluator
from .brevity import BrevityEvaluator, FollowUpQuestionEvaluator
from .bubble_format import BubbleFormatEvaluator
from .personalization import PersonalizationEvaluator
from .errors import NoErrorEvaluator


ALL_EVALUATORS: list[Evaluator] = [
    NoErrorEvaluator(),
    RedFlagEvaluator(),
    AllergyEvaluator(),
    LocaleEvaluator(),
    BrevityEvaluator(),
    FollowUpQuestionEvaluator(),
    BubbleFormatEvaluator(),
    PersonalizationEvaluator(),
]

__all__ = ["Evaluator", "ALL_EVALUATORS"]

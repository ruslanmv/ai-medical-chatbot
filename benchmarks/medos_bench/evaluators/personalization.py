"""Did the reply use the patient's specific profile fields?

Personalization is hard to measure perfectly — the proxy here is
"did the reply mention the medication name / condition name we'd
expect a personalised answer to reference?" Set per-case via
`should_mention_keywords`.

This is where MedOS's `<patient_context>` injection + system-prompt
instruction to cite-the-field should beat a baseline that has the
same data but no explicit usage rules.
"""

from __future__ import annotations

from ..types import Case, EvalResult, Reply
from .base import Evaluator, _normalize


class PersonalizationEvaluator(Evaluator):
    name = "personalization"

    def applies_to(self, case: Case) -> bool:
        return bool(case.checks.should_mention_keywords)

    def score_reply(self, case: Case, turn_idx: int, reply: Reply) -> EvalResult:
        text = _normalize(reply.content)
        wanted = case.checks.should_mention_keywords
        hits = [kw for kw in wanted if kw.lower() in text]
        if not hits:
            return EvalResult(
                self.name, 0.0, False, f"none of {wanted} mentioned — generic reply",
            )
        score = len(hits) / max(1, len(wanted))
        # A reply that mentions any one expected keyword passes;
        # full credit only when all are referenced.
        return EvalResult(
            self.name,
            score,
            True,
            f"mentioned {len(hits)}/{len(wanted)}: {', '.join(hits)}",
        )

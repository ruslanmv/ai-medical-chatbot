"""Shared dataclasses for the benchmark harness.

Kept dependency-free (stdlib only) so they import cleanly from clients,
evaluators, and the runner without circular imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PatientProfile:
    """Compact patient context. Mirrors the `<patient_context>` block
    the MedOS chat route injects server-side; we inject the same shape
    client-side so the benchmark works against the guest path without
    needing a per-case test account."""

    age: int | None = None
    sex: str | None = None  # "M" | "F" | "O" | None
    conditions: list[str] = field(default_factory=list)
    medications: list[str] = field(default_factory=list)
    allergies: list[str] = field(default_factory=list)
    country: str = "US"
    language: str = "en"

    def to_context_block(self) -> str:
        """Render as the same XML-tagged block both systems will see."""
        lines: list[str] = []
        demo: list[str] = []
        if self.age is not None:
            demo.append(f"age={self.age}")
        if self.sex:
            demo.append(f"sex={self.sex}")
        if demo:
            lines.append(" ".join(demo))
        if self.conditions:
            lines.append(f"conditions={', '.join(self.conditions)}")
        if self.allergies:
            lines.append(f"allergies={', '.join(self.allergies)}")
        if self.medications:
            lines.append(f"medications={', '.join(self.medications)}")
        if not lines:
            return ""
        body = "\n".join(lines)
        return f"\n<patient_context>\n{body}\n</patient_context>"


@dataclass
class Turn:
    """One user utterance in a multi-turn conversation."""

    user: str


@dataclass
class Checks:
    """Deterministic expectations the evaluators read.

    Every field is optional — a case only sets the checks that apply to
    its category. Evaluators consult `applies_to()` and skip silently
    when their check isn't set.
    """

    red_flag_expected: bool = False
    expected_emergency_keywords: list[str] = field(default_factory=list)
    forbidden_drugs: list[str] = field(default_factory=list)
    follow_up_questions_min: int | None = None
    follow_up_questions_max: int | None = None
    max_word_count: int | None = None
    should_use_bubbles: bool = False
    should_mention_keywords: list[str] = field(default_factory=list)


@dataclass
class Case:
    """One benchmark scenario: a patient, a conversation, and expectations."""

    id: str
    category: str
    description: str
    patient_profile: PatientProfile
    turns: list[Turn]
    checks: Checks

    @staticmethod
    def from_json(obj: dict[str, Any]) -> "Case":
        pp = obj.get("patient_profile", {}) or {}
        ck = obj.get("checks", {}) or {}
        return Case(
            id=obj["id"],
            category=obj["category"],
            description=obj.get("description", ""),
            patient_profile=PatientProfile(
                age=pp.get("age"),
                sex=pp.get("sex"),
                conditions=list(pp.get("conditions") or []),
                medications=list(pp.get("medications") or []),
                allergies=list(pp.get("allergies") or []),
                country=pp.get("country") or "US",
                language=pp.get("language") or "en",
            ),
            turns=[Turn(user=t["user"]) for t in obj["turns"]],
            checks=Checks(
                red_flag_expected=bool(ck.get("red_flag_expected", False)),
                expected_emergency_keywords=list(ck.get("expected_emergency_keywords") or []),
                forbidden_drugs=list(ck.get("forbidden_drugs") or []),
                follow_up_questions_min=ck.get("follow_up_questions_min"),
                follow_up_questions_max=ck.get("follow_up_questions_max"),
                max_word_count=ck.get("max_word_count"),
                should_use_bubbles=bool(ck.get("should_use_bubbles", False)),
                should_mention_keywords=list(ck.get("should_mention_keywords") or []),
            ),
        )


@dataclass
class Reply:
    """One assistant turn captured from a client."""

    content: str
    latency_ms: int
    system: str  # "medos" | "chatgpt"
    model: str = ""
    error: str | None = None  # populated when the call failed


@dataclass
class EvalResult:
    """A single evaluator's verdict on one (case, turn, reply)."""

    evaluator: str
    score: float  # 0.0 = fail, 1.0 = pass, partial allowed
    passed: bool
    reason: str

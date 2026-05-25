"""ChatGPT baseline client.

Uses the official OpenAI SDK against `chat.completions`. We give it a
charitable medical system prompt (a vanilla user wouldn't, but we want
the comparison to measure UX wins beyond mere prompt skill) and inject
the same patient_context block we feed MedOS, so both systems see
identical input.

This is the "honest baseline" — strong enough that any MedOS win
reflects a structural advantage, not a missing prompt.
"""

from __future__ import annotations

import time

from openai import AsyncOpenAI

from ..types import PatientProfile, Reply
from .base import ChatClient


BASELINE_SYSTEM_PROMPT = (
    "You are a helpful medical assistant. Be professional and empathetic. "
    "Use plain language. Hedge appropriately — never diagnose definitively. "
    "When the user shares a <patient_context> block, use it to personalize "
    "your advice (check allergies before suggesting drugs, flag interactions "
    "with the user's medications, account for age and sex). For emergency "
    "symptoms, tell the user to seek urgent care; in non-US locales, prefer "
    "the local emergency number when known. Keep replies concise."
)


class OpenAIClient(ChatClient):
    name = "chatgpt"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", timeout_s: float = 60.0) -> None:
        self._client = AsyncOpenAI(api_key=api_key, timeout=timeout_s)
        self.model = model

    async def send_turn(
        self,
        history: list[dict[str, str]],
        profile: PatientProfile,
        turn_idx: int,
    ) -> Reply:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": BASELINE_SYSTEM_PROMPT},
        ]
        # Mirror the MedOS injection pattern so both systems get the
        # same `<patient_context>` block on the first user turn.
        for i, m in enumerate(history):
            messages.append(dict(m))
        if turn_idx == 0 and messages[-1]["role"] == "user":
            block = profile.to_context_block()
            if block:
                messages[-1] = {
                    **messages[-1],
                    "content": messages[-1]["content"] + block,
                }

        start = time.monotonic()
        try:
            res = await self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.4,
                max_tokens=512,
            )
            latency_ms = int((time.monotonic() - start) * 1000)
            content = (res.choices[0].message.content or "").strip()
            return Reply(
                content=content,
                latency_ms=latency_ms,
                system=self.name,
                model=res.model or self.model,
            )
        except Exception as e:
            latency_ms = int((time.monotonic() - start) * 1000)
            return Reply(
                content="",
                latency_ms=latency_ms,
                system=self.name,
                model=self.model,
                error=f"{type(e).__name__}: {e}",
            )

    async def aclose(self) -> None:
        await self._client.close()

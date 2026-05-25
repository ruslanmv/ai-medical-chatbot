"""Client abstraction.

Two implementations live next to this: `medos.py` (POSTs the chat API
of a running MedOS deployment) and `openai_client.py` (the ChatGPT
baseline). Both expose the same async `send_turn()` so the runner can
loop over them uniformly.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..types import PatientProfile, Reply


class ChatClient(ABC):
    """Drives one multi-turn conversation against one system."""

    name: str  # "medos" | "chatgpt"

    @abstractmethod
    async def send_turn(
        self,
        history: list[dict[str, str]],
        profile: PatientProfile,
        turn_idx: int,
    ) -> Reply:
        """Send the conversation so far and return the next assistant turn.

        `history` is the OpenAI-style messages list of every previous
        user+assistant turn, ending with the *current* user message. The
        client is responsible for any system-prompt injection it wants
        on top of that.

        `turn_idx` is 0 for the first turn of the conversation, used by
        clients that need to inject the patient profile only once.
        """

    async def aclose(self) -> None:
        """Release any HTTP connection pools. Default no-op."""

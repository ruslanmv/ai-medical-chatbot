"""MedOS chat-route client.

POSTs to `POST {MEDOS_BASE_URL}/api/chat` with the OpenAI-style messages
shape the route expects. The patient profile is injected as a
`<patient_context>` block appended to the FIRST user message — matching
the guest-path behaviour of the production web client (see
`web/lib/hooks/useChat.ts`). The route's server-side strip preserves
guest-supplied blocks (unauthenticated requests), so the dataset profile
flows through to the LLM.

We deliberately request a non-streaming response (`stream: false`) so
the benchmark sees the complete reply in one block — easier to score
and timestamp deterministically.
"""

from __future__ import annotations

import json
import time

import httpx

from ..types import PatientProfile, Reply
from .base import ChatClient


class MedOSClient(ChatClient):
    name = "medos"

    def __init__(
        self,
        base_url: str,
        auth_token: str | None = None,
        timeout_s: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token or None
        self._http = httpx.AsyncClient(timeout=timeout_s)

    async def send_turn(
        self,
        history: list[dict[str, str]],
        profile: PatientProfile,
        turn_idx: int,
    ) -> Reply:
        # Inject the patient profile only on the first turn — same pattern
        # the production web client uses. After turn 0 the server still
        # has it on the conversation tail and the bubble system prompt
        # has it cached in context window.
        messages = [dict(m) for m in history]
        if turn_idx == 0 and messages and messages[-1]["role"] == "user":
            block = profile.to_context_block()
            if block:
                messages[-1] = {
                    **messages[-1],
                    "content": messages[-1]["content"] + block,
                }

        payload = {
            "messages": messages,
            "language": profile.language,
            "countryCode": profile.country,
            "stream": False,
        }
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        start = time.monotonic()
        try:
            res = await self._http.post(
                f"{self.base_url}/api/chat",
                json=payload,
                headers=headers,
            )
            latency_ms = int((time.monotonic() - start) * 1000)
            if res.status_code >= 400:
                return Reply(
                    content="",
                    latency_ms=latency_ms,
                    system=self.name,
                    error=f"HTTP {res.status_code}: {res.text[:200]}",
                )
            # The chat route ALWAYS returns SSE (text/event-stream) even
            # when stream:false — each line is `data: {...JSON delta...}`
            # terminated by `data: [DONE]`. We accumulate every chunk's
            # `choices[0].delta.content` (the format both card and bubble
            # paths emit) into the full reply, then return that.
            full_content = ""
            model_seen = ""
            for raw_line in (res.text or "").splitlines():
                line = raw_line.strip()
                if not line.startswith("data:"):
                    continue
                payload = line[len("data:") :].strip()
                if payload == "[DONE]" or not payload:
                    continue
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    # Non-JSON SSE line (rare — diagnostic / keep-alive).
                    # Skip rather than fail the whole request.
                    continue
                # Three shapes seen in production:
                #   { choices:[{delta:{content:"..."}}] }      ← LLM stream
                #   { choices:[{delta:{content:"...card..."}}]}← card emitter
                #   { content: "..." }                          ← rare fallback
                delta = (chunk.get("choices") or [{}])[0].get("delta", {})
                piece = delta.get("content") or chunk.get("content") or ""
                if piece:
                    full_content += piece
                if not model_seen and chunk.get("model"):
                    model_seen = chunk["model"]
            return Reply(
                content=full_content,
                latency_ms=latency_ms,
                system=self.name,
                model=model_seen or "medos",
            )
        except Exception as e:
            latency_ms = int((time.monotonic() - start) * 1000)
            return Reply(
                content="",
                latency_ms=latency_ms,
                system=self.name,
                error=f"{type(e).__name__}: {e}",
            )

    async def aclose(self) -> None:
        await self._http.aclose()

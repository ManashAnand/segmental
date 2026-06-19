"""Ollama local LLM provider."""

from __future__ import annotations

import logging

import httpx

from app.services.llm.interface import LLMProvider
from app.utils.config import Settings

logger = logging.getLogger(__name__)


class OllamaProvider(LLMProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._base_url = settings.ollama_base_url.rstrip("/")

    @property
    def name(self) -> str:
        return f"ollama:{self.settings.ollama_model}"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        json_mode: bool = False,
    ) -> str:
        payload = {
            "model": self.settings.ollama_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {"temperature": 0},
        }
        if json_mode:
            payload["format"] = "json"
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(f"{self._base_url}/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()

        content = data.get("message", {}).get("content")
        if not content:
            raise RuntimeError("Ollama returned an empty response")
        logger.debug("Ollama completion (%s chars)", len(content))
        return content.strip()

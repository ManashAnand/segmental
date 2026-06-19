"""Groq cloud LLM provider."""

from __future__ import annotations

import logging

from groq import AsyncGroq

from app.services.llm.interface import LLMProvider
from app.utils.config import Settings

logger = logging.getLogger(__name__)


class GroqProvider(LLMProvider):
    def __init__(self, settings: Settings) -> None:
        if not settings.groq_configured:
            raise ValueError("GROQ_API_KEY is not set")
        self.settings = settings
        self._client = AsyncGroq(api_key=settings.groq_api_key)

    @property
    def name(self) -> str:
        return f"groq:{self.settings.groq_model}"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        json_mode: bool = False,
    ) -> str:
        kwargs: dict = {
            "model": self.settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Groq returned an empty response")
        logger.debug("Groq completion (%s chars)", len(content))
        return content.strip()

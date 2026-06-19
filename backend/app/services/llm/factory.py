"""Select Groq or Ollama based on configuration."""

from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import HTTPException, status

from app.services.llm.groq_provider import GroqProvider
from app.services.llm.interface import LLMProvider
from app.services.llm.ollama_provider import OllamaProvider
from app.utils.config import Settings, get_settings

logger = logging.getLogger(__name__)


class FallbackLLMProvider(LLMProvider):
    """Try Groq first when configured; otherwise use Ollama."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._primary: LLMProvider | None = None
        self._fallback: LLMProvider | None = None

        if settings.groq_configured:
            self._primary = GroqProvider(settings)
        self._fallback = OllamaProvider(settings)

    @property
    def name(self) -> str:
        if self._primary is not None:
            return f"auto({self._primary.name}->{self._fallback.name})"
        return f"auto({self._fallback.name})"

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        json_mode: bool = False,
    ) -> str:
        if self._primary is not None:
            try:
                return await self._primary.complete(
                    system_prompt, user_prompt, json_mode=json_mode
                )
            except Exception as exc:
                logger.warning("Groq failed, falling back to Ollama: %s", exc)

        try:
            return await self._fallback.complete(
                system_prompt, user_prompt, json_mode=json_mode
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"LLM unavailable (Groq and Ollama failed): {exc}",
            ) from exc


def create_llm_provider(settings: Settings | None = None) -> LLMProvider:
    settings = settings or get_settings()
    mode = settings.llm_provider

    if mode == "groq":
        return GroqProvider(settings)
    if mode == "ollama":
        return OllamaProvider(settings)
    return FallbackLLMProvider(settings)


@lru_cache
def get_llm_provider() -> LLMProvider:
    return create_llm_provider()

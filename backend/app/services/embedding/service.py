"""Sentence-transformer embedding service."""

from __future__ import annotations

import asyncio
from functools import lru_cache

from app.utils.config import get_settings


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._model = None

    def _load_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.settings.model_name)
        return self._model

    def preload(self) -> None:
        self._load_model()

    def _encode_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._load_model()
        vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [vector.tolist() for vector in vectors]

    async def encode(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self._encode_sync, texts)

    async def encode_one(self, text: str) -> list[float]:
        vectors = await self.encode([text])
        return vectors[0]


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()

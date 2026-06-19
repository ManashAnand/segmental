"""Top-k chunk retrieval from pgvector with financial-table re-ranking."""

from __future__ import annotations

import logging
import re

from app.db.pool import get_pool
from app.db.vector import vector_literal
from app.models.retrieval import RetrievedChunk
from app.services.embedding.service import EmbeddingService
from app.utils.config import get_settings
from app.utils.files import slugify_company

logger = logging.getLogger(__name__)

_FINANCIAL_MARKERS = (
    "$",
    "million",
    "consolidated",
    "revenue",
    "research and development",
    "net income",
    "year ended december",
    "segment",
    "geographic",
    "americas",
)


class ChunkRetrievalService:
    def __init__(self, embedding_service: EmbeddingService) -> None:
        self.embedding_service = embedding_service
        self.settings = get_settings()

    async def retrieve_chunks(
        self,
        company: str,
        query: str,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        pool = get_pool()
        if pool is None:
            return []

        slug = slugify_company(company)
        limit = top_k or self.settings.retrieval_top_k
        fetch_limit = min(limit * 3, 30)
        query_embedding = await self.embedding_service.encode_one(query)

        async with pool.acquire() as conn:
            company_id = await conn.fetchval(
                "SELECT id FROM companies WHERE slug = $1",
                slug,
            )
            if company_id is None:
                return []

            rows = await conn.fetch(
                """
                SELECT page_number, chunk_index, text,
                       1 - (embedding <=> $2::vector) AS score
                FROM document_chunks
                WHERE company_id = $1
                ORDER BY embedding <=> $2::vector
                LIMIT $3
                """,
                company_id,
                vector_literal(query_embedding),
                fetch_limit,
            )

        chunks = [
            RetrievedChunk(
                page_number=row["page_number"],
                chunk_index=row["chunk_index"],
                text=row["text"],
                score=float(row["score"]),
            )
            for row in rows
        ]
        ranked = _rerank_financial(chunks)[:limit]
        logger.debug("Retrieved %s chunks for %s (from %s candidates)", len(ranked), slug, len(chunks))
        return ranked


def _rerank_financial(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    def boosted_score(chunk: RetrievedChunk) -> float:
        text = chunk.text
        lower = text.lower()
        boost = 0.0
        for marker in _FINANCIAL_MARKERS:
            if marker in lower:
                boost += 0.015
        if re.search(r"\$[\d,]+", text):
            boost += 0.08
        if re.search(r"20\d{2}", text):
            boost += 0.03
        return chunk.score + boost

    return sorted(chunks, key=boosted_score, reverse=True)

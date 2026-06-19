"""Semantic page retrieval using pgvector."""

from __future__ import annotations

import logging

from app.db.pool import get_pool
from app.db.vector import vector_literal
from app.models.enums import ExtractionField
from app.models.extraction import PageContent
from app.services.embedding.service import EmbeddingService
from app.services.retrieval.interface import RetrievalServiceInterface
from app.utils.files import slugify_company

logger = logging.getLogger(__name__)


class SemanticRetrievalService(RetrievalServiceInterface):
    FIELD_QUERIES: dict[ExtractionField, str] = {
        ExtractionField.GEOGRAPHIC_REVENUE: (
            "revenue by geographic region Americas North America international "
            "revenue by country"
        ),
        ExtractionField.SEGMENT_REVENUE: (
            "reportable segment revenue operating segments business segments "
            "segment information"
        ),
        ExtractionField.RND_EXPENSE: (
            "research and development expense income statement technology and "
            "development R&D"
        ),
    }

    def __init__(self, embedding_service: EmbeddingService) -> None:
        self.embedding_service = embedding_service

    async def retrieve_relevant_pages(
        self,
        company: str,
        field: ExtractionField,
        pages: list[PageContent],
        top_k: int = 5,
    ) -> list[PageContent]:
        pool = get_pool()
        if pool is None:
            return []

        slug = slugify_company(company)
        query = self.FIELD_QUERIES[field]
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
                SELECT page_number, text, 1 - (embedding <=> $2::vector) AS score
                FROM document_chunks
                WHERE company_id = $1
                ORDER BY embedding <=> $2::vector
                LIMIT $3
                """,
                company_id,
                vector_literal(query_embedding),
                max(top_k * 4, top_k),
            )

        if not rows:
            return []

        page_scores: dict[int, float] = {}
        for row in rows:
            page_number = row["page_number"]
            score = float(row["score"])
            page_scores[page_number] = max(page_scores.get(page_number, 0.0), score)

        ranked_pages = sorted(page_scores.items(), key=lambda item: item[1], reverse=True)
        selected_page_numbers = [page_number for page_number, _ in ranked_pages[:top_k]]

        pages_by_number = {page.page_number: page for page in pages}
        selected: list[PageContent] = []
        for page_number in selected_page_numbers:
            page = pages_by_number.get(page_number)
            if page is not None:
                selected.append(page)

        logger.debug(
            "Semantic retrieval for %s/%s -> pages %s",
            slug,
            field.value,
            selected_page_numbers,
        )
        return selected

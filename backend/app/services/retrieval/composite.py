"""Semantic retrieval with keyword fallback."""

from __future__ import annotations

import logging

from app.models.enums import ExtractionField
from app.models.extraction import PageContent
from app.services.retrieval.interface import RetrievalServiceInterface
from app.services.retrieval.semantic import SemanticRetrievalService
from app.services.retrieval.service import RetrievalService

logger = logging.getLogger(__name__)


class CompositeRetrievalService(RetrievalServiceInterface):
    def __init__(
        self,
        semantic_service: SemanticRetrievalService,
        keyword_service: RetrievalService,
    ) -> None:
        self.semantic_service = semantic_service
        self.keyword_service = keyword_service

    async def retrieve_relevant_pages(
        self,
        company: str,
        field: ExtractionField,
        pages: list[PageContent],
        top_k: int = 5,
    ) -> list[PageContent]:
        semantic_pages = await self.semantic_service.retrieve_relevant_pages(
            company=company,
            field=field,
            pages=pages,
            top_k=top_k,
        )
        if semantic_pages:
            return semantic_pages

        logger.debug(
            "Falling back to keyword retrieval for %s/%s",
            company,
            field.value,
        )
        return await self.keyword_service.retrieve_relevant_pages(
            company=company,
            field=field,
            pages=pages,
            top_k=top_k,
        )

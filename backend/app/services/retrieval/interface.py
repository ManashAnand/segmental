"""Keyword-family page retrieval service."""

from abc import ABC, abstractmethod

from app.models.enums import ExtractionField
from app.models.extraction import PageContent


class RetrievalServiceInterface(ABC):
    @abstractmethod
    async def retrieve_relevant_pages(
        self,
        company: str,
        field: ExtractionField,
        pages: list[PageContent],
        top_k: int = 5,
    ) -> list[PageContent]:
        raise NotImplementedError

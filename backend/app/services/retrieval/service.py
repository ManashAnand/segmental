"""Retrieval service implementation."""

from app.models.enums import ExtractionField
from app.models.extraction import PageContent
from app.services.retrieval.interface import RetrievalServiceInterface


class RetrievalService(RetrievalServiceInterface):
    SEGMENT_TERMS: list[str] = [
        "segment",
        "reportable segment",
        "operating segment",
        "business segment",
    ]
    GEOGRAPHY_TERMS: list[str] = [
        "geography",
        "geographic",
        "region",
        "international revenue",
        "north america",
        "americas",
    ]
    RND_TERMS: list[str] = [
        "research and development",
        "r&d",
        "technology and content",
        "product development",
    ]

    FIELD_TERMS: dict[ExtractionField, list[str]] = {
        ExtractionField.GEOGRAPHIC_REVENUE: GEOGRAPHY_TERMS,
        ExtractionField.SEGMENT_REVENUE: SEGMENT_TERMS,
        ExtractionField.RND_EXPENSE: RND_TERMS,
    }

    def _score_page(self, text: str, terms: list[str]) -> int:
        lower = text.lower()
        return sum(lower.count(term) for term in terms)

    async def retrieve_relevant_pages(
        self,
        company: str,
        field: ExtractionField,
        pages: list[PageContent],
        top_k: int = 5,
    ) -> list[PageContent]:
        terms = self.FIELD_TERMS[field]
        scored = [
            (self._score_page(page.text, terms), page)
            for page in pages
            if page.company == company or not page.company
        ]
        scored = [(score, page) for score, page in scored if score > 0]
        scored.sort(key=lambda item: item[0], reverse=True)
        return [page for _, page in scored[:top_k]]

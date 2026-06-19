"""Financial field extraction service."""

from abc import ABC, abstractmethod

from app.models.enums import ExtractionVersion
from app.models.extraction import ExtractionResult, PageContent
from app.schemas.extraction import ExtractRequest, ExtractResponse, ExtractionResultResponse


class ExtractionServiceInterface(ABC):
    @abstractmethod
    async def extract(self, request: ExtractRequest) -> ExtractResponse:
        raise NotImplementedError

    @abstractmethod
    async def get_results(
        self,
        version: ExtractionVersion,
        company: str | None = None,
    ) -> ExtractionResultResponse:
        raise NotImplementedError

    @abstractmethod
    async def extract_from_pages(
        self,
        company: str,
        field_pages: dict[str, list[PageContent]],
    ) -> ExtractionResult:
        raise NotImplementedError

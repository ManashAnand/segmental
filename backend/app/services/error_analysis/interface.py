"""Error analysis service."""

from abc import ABC, abstractmethod

from app.models.enums import ErrorCategory, ExtractionField, ExtractionVersion
from app.schemas.error import ErrorAnalysisResponse


class ErrorAnalysisServiceInterface(ABC):
    @abstractmethod
    async def get_errors(
        self,
        version: ExtractionVersion | None = None,
        company: str | None = None,
    ) -> ErrorAnalysisResponse:
        raise NotImplementedError

    @abstractmethod
    async def classify_error(
        self,
        company: str,
        field: ExtractionField,
        version: ExtractionVersion,
        expected: float | None,
        extracted: float | None,
        context: dict | None = None,
    ) -> ErrorCategory:
        raise NotImplementedError

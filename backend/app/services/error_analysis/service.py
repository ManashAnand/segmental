"""Error analysis service implementation (skeleton)."""

from app.models.enums import ErrorCategory, ExtractionField, ExtractionVersion
from app.schemas.error import ErrorAnalysisResponse
from app.services.error_analysis.interface import ErrorAnalysisServiceInterface


class ErrorAnalysisService(ErrorAnalysisServiceInterface):
    async def get_errors(
        self,
        version: ExtractionVersion | None = None,
        company: str | None = None,
    ) -> ErrorAnalysisResponse:
        # TODO: load persisted error records
        raise NotImplementedError("Error retrieval not implemented")

    async def classify_error(
        self,
        company: str,
        field: ExtractionField,
        version: ExtractionVersion,
        expected: float | None,
        extracted: float | None,
        context: dict | None = None,
    ) -> ErrorCategory:
        # TODO: classify into:
        # wrong_page_retrieved | correct_page_wrong_value |
        # multiple_fiscal_years | table_parsing_failure | different_terminology
        raise NotImplementedError("Error classification not implemented")

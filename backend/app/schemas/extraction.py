"""Extraction endpoint schemas."""

from pydantic import BaseModel, Field

from app.models.enums import ExtractionVersion
from app.models.extraction import ExtractionResult


class ExtractRequest(BaseModel):
    companies: list[str] | None = Field(
        default=None,
        description="Companies to extract; defaults to all available PDFs",
    )
    version: ExtractionVersion = Field(
        default=ExtractionVersion.V1,
        description="Extraction pipeline version",
    )
    use_cache: bool = Field(
        default=True,
        description="Use cached page text when available",
    )


class ExtractResponse(BaseModel):
    version: ExtractionVersion
    companies_processed: list[str]
    results_path: str
    message: str


class ExtractionResultResponse(BaseModel):
    version: ExtractionVersion
    results: list[ExtractionResult]

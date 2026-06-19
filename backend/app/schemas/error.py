"""Error analysis endpoint schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ErrorCategory, ExtractionField, ExtractionVersion


class ErrorRecordResponse(BaseModel):
    company: str
    field: ExtractionField
    version: ExtractionVersion
    category: ErrorCategory
    expected: float | None = None
    extracted: float | None = None
    source_page: int | None = None
    details: str | None = None
    created_at: datetime | None = None


class ErrorAnalysisResponse(BaseModel):
    version: ExtractionVersion | None = None
    total_errors: int
    by_category: dict[str, int] = Field(default_factory=dict)
    by_field: dict[str, int] = Field(default_factory=dict)
    errors: list[ErrorRecordResponse]

"""Extraction domain models."""

from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ExtractionField, ExtractionVersion


class PageContent(BaseModel):
    company: str
    page_number: int
    text: str


class FieldExtraction(BaseModel):
    field: ExtractionField
    label: str | None = None
    value: float | None = None
    unit: str | None = None
    source_page: int | None = None
    raw_text: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExtractionResult(BaseModel):
    company: str
    version: ExtractionVersion = ExtractionVersion.V1
    geographic_revenue: list[FieldExtraction] = Field(default_factory=list)
    segment_revenue: list[FieldExtraction] = Field(default_factory=list)
    rnd_expense: FieldExtraction | None = None

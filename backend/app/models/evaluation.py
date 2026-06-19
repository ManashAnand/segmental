"""Evaluation domain models."""

from pydantic import BaseModel, Field

from app.models.enums import ExtractionField, ExtractionVersion


class FieldEvaluation(BaseModel):
    company: str
    field: ExtractionField
    expected: float | None = None
    extracted: float | None = None
    exact_match: bool = False
    relative_error: float | None = None


class EvaluationMetrics(BaseModel):
    version: ExtractionVersion
    exact_match_pct: float = 0.0
    mean_relative_error_pct: float | None = None
    field_accuracy: dict[str, float] = Field(default_factory=dict)
    overall_accuracy: float = 0.0
    total_comparisons: int = 0
    passed_comparisons: int = 0

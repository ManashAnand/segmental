"""Evaluation endpoint schemas."""

from pydantic import BaseModel, Field

from app.models.enums import ExtractionVersion
from app.models.evaluation import EvaluationMetrics


class EvaluateRequest(BaseModel):
    version: ExtractionVersion = Field(
        default=ExtractionVersion.V1,
        description="Extraction version to evaluate against ground truth",
    )
    results_file: str | None = Field(
        default=None,
        description="Extraction results JSON filename; defaults to results.json",
    )
    ground_truth_file: str | None = Field(
        default=None,
        description="Optional ground truth CSV filename; defaults to ground_truth.csv",
    )
    tolerance: float = Field(
        default=0.01,
        description="Relative error tolerance for a match (used when ground truth exists)",
    )


class EvaluationReportItem(BaseModel):
    company: str
    field: str
    candidates: list[float] = Field(default_factory=list)
    true: float | None = None
    match: bool | None = None


class EvaluateResponse(BaseModel):
    version: ExtractionVersion
    metrics: EvaluationMetrics
    report: list[EvaluationReportItem]
    message: str


class MetricsResponse(BaseModel):
    v1: EvaluationMetrics | None = None
    v2: EvaluationMetrics | None = None
    comparison: dict[str, float] | None = Field(
        default=None,
        description="V2 minus V1 delta for key metrics",
    )

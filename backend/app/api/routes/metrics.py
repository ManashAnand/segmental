"""GET /metrics — retrieve evaluation metrics."""

from fastapi import APIRouter, Depends, Query

from app.models.enums import ExtractionVersion
from app.schemas.evaluation import MetricsResponse
from app.services.evaluation.service import EvaluationService
from app.utils.dependencies import get_evaluation_service

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    version: ExtractionVersion | None = Query(default=None),
    evaluation_service: EvaluationService = Depends(get_evaluation_service),
) -> MetricsResponse:
    """Return evaluation metrics; optionally compare V1 vs V2."""
    return await evaluation_service.get_metrics(version=version)

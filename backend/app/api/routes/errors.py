"""GET /errors — retrieve classified extraction errors."""

from fastapi import APIRouter, Depends, Query

from app.models.enums import ExtractionVersion
from app.schemas.error import ErrorAnalysisResponse
from app.services.error_analysis.service import ErrorAnalysisService
from app.utils.dependencies import get_error_analysis_service

router = APIRouter()


@router.get("/errors", response_model=ErrorAnalysisResponse)
async def get_errors(
    version: ExtractionVersion | None = Query(default=None),
    company: str | None = Query(default=None),
    error_service: ErrorAnalysisService = Depends(get_error_analysis_service),
) -> ErrorAnalysisResponse:
    """Return error analysis records with category breakdown."""
    return await error_service.get_errors(version=version, company=company)

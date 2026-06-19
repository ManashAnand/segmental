"""GET /results — retrieve stored extraction results."""

from fastapi import APIRouter, Depends, Query

from app.models.enums import ExtractionVersion
from app.schemas.extraction import ExtractionResultResponse
from app.services.extraction.service import ExtractionService
from app.utils.dependencies import get_extraction_service

router = APIRouter()


@router.get("/results", response_model=ExtractionResultResponse)
async def get_results(
    version: ExtractionVersion = Query(default=ExtractionVersion.V1),
    company: str | None = Query(default=None),
    extraction_service: ExtractionService = Depends(get_extraction_service),
) -> ExtractionResultResponse:
    """Return persisted extraction results, optionally filtered by company."""
    return await extraction_service.get_results(version=version, company=company)

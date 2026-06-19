"""POST /extract — run extraction pipeline for one or more companies."""

from fastapi import APIRouter, Depends

from app.schemas.extraction import ExtractRequest, ExtractResponse
from app.services.extraction.service import ExtractionService
from app.utils.dependencies import get_extraction_service

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_fields(
    request: ExtractRequest,
    extraction_service: ExtractionService = Depends(get_extraction_service),
) -> ExtractResponse:
    """
    Re-run extraction for PDFs already in data/pdfs/.

    Upload via POST /upload runs extraction automatically.
    Use this to batch re-process or refresh cached results.
    """
    return await extraction_service.extract(request)

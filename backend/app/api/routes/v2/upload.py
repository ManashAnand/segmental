"""POST /api/v2/upload — PDF upload + full-document embedding index."""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.schemas.v2 import V2UploadResponse
from app.services.extraction.v2_service import V2IngestService
from app.utils.dependencies import get_v2_ingest_service

router = APIRouter()


@router.post("/upload", response_model=V2UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    company: str | None = Form(default=None),
    overwrite: bool = Form(default=False),
    service: V2IngestService = Depends(get_v2_ingest_service),
) -> V2UploadResponse:
    """Upload a 10-K PDF and embed all page chunks into Postgres (not field-specific)."""
    return await service.upload_and_index(company=company, file=file, overwrite=overwrite)

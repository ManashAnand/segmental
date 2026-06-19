"""POST /upload — store a 10-K PDF and run extraction."""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.models.enums import ExtractionVersion
from app.schemas.extraction import ExtractRequest
from app.schemas.upload import UploadResponse
from app.services.extraction.service import ExtractionService
from app.services.pdf_extraction.service import PDFExtractionService
from app.utils.dependencies import get_extraction_service, get_pdf_extraction_service

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    company: str | None = Form(
        default=None,
        description="Leave empty to derive from filename (e.g. adbe-2024-annual-report.pdf → adbe)",
    ),
    overwrite: bool = Form(default=False),
    pdf_service: PDFExtractionService = Depends(get_pdf_extraction_service),
    extraction_service: ExtractionService = Depends(get_extraction_service),
) -> UploadResponse:
    """
    Upload a 10-K PDF to data/pdfs/ and immediately extract financial fields.

    Company slug is derived from the filename when omitted.
    Results are merged into data/extracted/results.json.
    """
    saved = await pdf_service.upload_pdf(company=company, file=file, overwrite=overwrite)

    extraction = await extraction_service.extract(
        ExtractRequest(
            companies=[saved.company],
            version=ExtractionVersion.V1,
            use_cache=False,
        )
    )

    return UploadResponse(
        company=saved.company,
        filename=saved.filename,
        path=saved.path,
        message=f"{saved.message}. Extraction complete.",
        extraction=extraction,
    )

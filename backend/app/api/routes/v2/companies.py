"""GET /api/v2/companies/{company}/pdf and /info."""

from __future__ import annotations

import pdfplumber
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.db.pool import get_pool
from app.schemas.v2 import CompanyInfoResponse
from app.services.pdf_extraction.service import PDFExtractionService
from app.utils.dependencies import get_pdf_extraction_service
from app.utils.files import slugify_company

router = APIRouter()


@router.get("/companies/{company}/pdf")
async def get_company_pdf(
    company: str,
    pdf_service: PDFExtractionService = Depends(get_pdf_extraction_service),
) -> FileResponse:
    slug = slugify_company(company)
    path = pdf_service.pdf_path_for(slug)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No PDF found for company '{slug}'",
        )
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=path.name,
        content_disposition_type="inline",
    )


@router.get("/companies/{company}/info", response_model=CompanyInfoResponse)
async def get_company_info(
    company: str,
    pdf_service: PDFExtractionService = Depends(get_pdf_extraction_service),
) -> CompanyInfoResponse:
    slug = slugify_company(company)
    path = pdf_service.pdf_path_for(slug)
    pdf_available = path.exists()
    page_count = 0

    if pdf_available:
        with pdfplumber.open(path) as pdf:
            page_count = len(pdf.pages)

    chunk_count = 0
    indexed = False
    pool = get_pool()
    if pool is not None:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT chunk_count FROM companies WHERE slug = $1",
                slug,
            )
            if row is not None:
                chunk_count = int(row["chunk_count"])
                indexed = chunk_count > 0

    return CompanyInfoResponse(
        company=slug,
        pdf_available=pdf_available,
        indexed=indexed,
        page_count=page_count,
        chunk_count=chunk_count,
        filename=path.name if pdf_available else None,
    )

"""PDF extraction service implementation."""

import json
from pathlib import Path

import pdfplumber
from fastapi import HTTPException, UploadFile, status

from app.models.extraction import PageContent
from app.schemas.upload import SavedPdfResult
from app.services.pdf_extraction.interface import PDFExtractionServiceInterface
from app.utils.config import get_settings
from app.utils.files import derive_company_from_filename, ensure_dir, resolve_company_slug, slugify_company


class PDFExtractionService(PDFExtractionServiceInterface):
    def __init__(self) -> None:
        self.settings = get_settings()
        self.pdfs_dir = ensure_dir(self.settings.pdfs_dir)
        self.cache_dir = ensure_dir(self.settings.cache_dir)

    def pdf_path_for(self, company: str) -> Path:
        return self.pdfs_dir / f"{slugify_company(company)}.pdf"

    def cache_path_for(self, company: str) -> Path:
        return self.cache_dir / f"{slugify_company(company)}.json"

    async def upload_pdf(
        self,
        company: str | None,
        file: UploadFile,
        overwrite: bool = False,
    ) -> SavedPdfResult:
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are accepted",
            )

        derived = False
        slug, derived = resolve_company_slug(company, filename)

        if not slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not derive company from filename. Rename the file (e.g. apple-10k.pdf) or pass company explicitly.",
            )

        dest = self.pdf_path_for(slug)
        if dest.exists() and not overwrite:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"PDF already exists for '{slug}'. Set overwrite=true to replace.",
            )

        content = await file.read()
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is not a valid PDF",
            )

        dest.write_bytes(content)
        self._invalidate_cache(slug)

        return SavedPdfResult(
            company=slug,
            filename=dest.name,
            path=str(dest),
            message=(
                f"PDF saved for {slug} (derived from '{filename}')"
                if derived
                else f"PDF saved for {slug}"
            ),
        )

    def _invalidate_cache(self, company: str) -> None:
        cache_path = self.cache_path_for(company)
        if cache_path.exists():
            cache_path.unlink()

    async def extract_pages(
        self,
        company: str,
        pdf_path: Path | None = None,
        use_cache: bool = True,
    ) -> list[PageContent]:
        slug = slugify_company(company)
        path = pdf_path or self.pdf_path_for(slug)
        cache_path = self.cache_path_for(slug)

        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No PDF found for company '{slug}'",
            )

        if use_cache and cache_path.exists():
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            return [PageContent(**page) for page in cached]

        pages: list[PageContent] = []
        with pdfplumber.open(path) as pdf:
            for index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append(PageContent(company=slug, page_number=index, text=text))

        cache_path.write_text(
            json.dumps([page.model_dump() for page in pages], indent=2),
            encoding="utf-8",
        )
        return pages

    async def list_companies(self) -> list[str]:
        return sorted(path.stem for path in self.pdfs_dir.glob("*.pdf"))

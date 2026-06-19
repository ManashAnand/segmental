"""PDF text extraction service."""

from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import UploadFile

from app.models.extraction import PageContent
from app.schemas.upload import SavedPdfResult


class PDFExtractionServiceInterface(ABC):
    @abstractmethod
    async def upload_pdf(
        self,
        company: str | None,
        file: UploadFile,
        overwrite: bool = False,
    ) -> SavedPdfResult:
        raise NotImplementedError

    @abstractmethod
    async def extract_pages(
        self,
        company: str,
        pdf_path: Path | None = None,
        use_cache: bool = True,
    ) -> list[PageContent]:
        raise NotImplementedError

    @abstractmethod
    async def list_companies(self) -> list[str]:
        raise NotImplementedError

"""V2 pipeline: embed full document on upload; query with any question."""

from app.schemas.v2 import V2UploadResponse
from app.services.ingest.service import IngestService
from app.services.pdf_extraction.service import PDFExtractionService


class V2IngestService:
    def __init__(
        self,
        pdf_service: PDFExtractionService,
        ingest_service: IngestService,
    ) -> None:
        self.pdf_service = pdf_service
        self.ingest_service = ingest_service

    async def upload_and_index(
        self,
        company: str | None,
        file,
        overwrite: bool = False,
    ) -> V2UploadResponse:
        saved = await self.pdf_service.upload_pdf(
            company=company,
            file=file,
            overwrite=overwrite,
        )
        pages = await self.pdf_service.extract_pages(
            saved.company,
            use_cache=False,
        )
        pdf_path = self.pdf_service.pdf_path_for(saved.company)
        chunk_count = await self.ingest_service.ensure_indexed(
            saved.company,
            pdf_path,
            pages,
            force=True,
        )

        return V2UploadResponse(
            company=saved.company,
            filename=saved.filename,
            path=saved.path,
            chunks_indexed=chunk_count,
            message=f"{saved.message}. Indexed {chunk_count} chunks for semantic retrieval.",
        )

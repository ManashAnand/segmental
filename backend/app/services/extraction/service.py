"""Extraction service implementation."""

import json
from pathlib import Path

from fastapi import HTTPException, status

from app.models.enums import ExtractionField, ExtractionVersion
from app.models.extraction import ExtractionResult, FieldExtraction, PageContent
from app.schemas.extraction import ExtractRequest, ExtractResponse, ExtractionResultResponse
from app.services.evaluation.numbers import best_guess_number
from app.services.extraction.interface import ExtractionServiceInterface
from app.services.extraction.parsers import extract_table_hits, extract_text_hits
from app.services.pdf_extraction.service import PDFExtractionService
from app.services.retrieval.service import RetrievalService
from app.utils.config import get_settings
from app.utils.files import ensure_dir, slugify_company


class ExtractionService(ExtractionServiceInterface):
    RESULTS_FILE = "results.json"

    def __init__(
        self,
        pdf_service: PDFExtractionService,
        retrieval_service: RetrievalService,
    ) -> None:
        self.pdf_service = pdf_service
        self.retrieval_service = retrieval_service
        self.settings = get_settings()
        self.extracted_dir = ensure_dir(self.settings.extracted_dir)

    def _results_path(self) -> Path:
        return self.extracted_dir / self.RESULTS_FILE

    async def extract(self, request: ExtractRequest) -> ExtractResponse:
        companies = request.companies
        if not companies:
            companies = await self.pdf_service.list_companies()

        if not companies:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No PDFs found. Upload a PDF first via POST /upload.",
            )

        results: dict[str, dict[str, list[dict]]] = {}
        processed: list[str] = []

        for company in companies:
            slug = slugify_company(company)
            pages = await self.pdf_service.extract_pages(slug, use_cache=request.use_cache)
            pdf_path = self.pdf_service.pdf_path_for(slug)
            company_results: dict[str, list[dict]] = {}

            for field in ExtractionField:
                relevant_pages = await self.retrieval_service.retrieve_relevant_pages(
                    company=slug,
                    field=field,
                    pages=pages,
                )
                page_hits: list[dict] = []
                for page in relevant_pages:
                    page_hits.append(
                        {
                            "page": page.page_number,
                            "table_hits": extract_table_hits(pdf_path, page.page_number),
                            "text_hits": extract_text_hits(page.text, field.value),
                        }
                    )
                company_results[field.value] = page_hits

            results[slug] = company_results
            processed.append(slug)

        results_path = self._results_path()
        merged = self._load_existing_results()
        merged.update(results)
        results_path.write_text(json.dumps(merged, indent=2), encoding="utf-8")

        return ExtractResponse(
            version=request.version,
            companies_processed=processed,
            results_path=str(results_path),
            message=f"Extracted {len(processed)} companies",
        )

    def _load_existing_results(self) -> dict[str, dict[str, list[dict]]]:
        results_path = self._results_path()
        if not results_path.exists():
            return {}
        return json.loads(results_path.read_text(encoding="utf-8"))

    async def get_results(
        self,
        version: ExtractionVersion,
        company: str | None = None,
    ) -> ExtractionResultResponse:
        results_path = self._results_path()
        if not results_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No extraction results found. Run POST /extract first.",
            )

        raw = json.loads(results_path.read_text(encoding="utf-8"))
        if company:
            slug = slugify_company(company)
            if slug not in raw:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No results for company '{slug}'",
                )
            raw = {slug: raw[slug]}

        extraction_results: list[ExtractionResult] = []
        for comp, fields in raw.items():
            geo = self._field_extractions(fields.get("geographic_revenue", []), ExtractionField.GEOGRAPHIC_REVENUE)
            seg = self._field_extractions(fields.get("segment_revenue", []), ExtractionField.SEGMENT_REVENUE)
            rnd_candidates = best_guess_number(fields.get("rnd_expense", []))
            rnd = None
            if rnd_candidates:
                rnd = FieldExtraction(
                    field=ExtractionField.RND_EXPENSE,
                    value=rnd_candidates[0],
                )
            extraction_results.append(
                ExtractionResult(
                    company=comp,
                    version=version,
                    geographic_revenue=geo,
                    segment_revenue=seg,
                    rnd_expense=rnd,
                )
            )

        return ExtractionResultResponse(version=version, results=extraction_results)

    def _field_extractions(
        self,
        field_results: list[dict],
        field: ExtractionField,
    ) -> list[FieldExtraction]:
        extractions: list[FieldExtraction] = []
        for page_result in field_results:
            candidates = best_guess_number([page_result])
            if not candidates:
                continue
            extractions.append(
                FieldExtraction(
                    field=field,
                    value=candidates[0],
                    source_page=page_result.get("page"),
                )
            )
        return extractions

    async def extract_from_pages(
        self,
        company: str,
        field_pages: dict[str, list[PageContent]],
    ) -> ExtractionResult:
        slug = slugify_company(company)
        pdf_path = self.pdf_service.pdf_path_for(slug)
        geo: list[FieldExtraction] = []
        seg: list[FieldExtraction] = []
        rnd: FieldExtraction | None = None

        for field_name, pages in field_pages.items():
            page_hits = []
            for page in pages:
                page_hits.append(
                    {
                        "page": page.page_number,
                        "table_hits": extract_table_hits(pdf_path, page.page_number),
                        "text_hits": extract_text_hits(page.text, field_name),
                    }
                )
            candidates = best_guess_number(page_hits)
            if not candidates:
                continue
            extraction = FieldExtraction(
                field=ExtractionField(field_name),
                value=candidates[0],
            )
            if field_name == ExtractionField.GEOGRAPHIC_REVENUE.value:
                geo.append(extraction)
            elif field_name == ExtractionField.SEGMENT_REVENUE.value:
                seg.append(extraction)
            elif field_name == ExtractionField.RND_EXPENSE.value:
                rnd = extraction

        return ExtractionResult(
            company=slug,
            geographic_revenue=geo,
            segment_revenue=seg,
            rnd_expense=rnd,
        )

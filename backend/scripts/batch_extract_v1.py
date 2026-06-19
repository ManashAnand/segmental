#!/usr/bin/env python3
"""
Batch extract all 10-K PDFs and save per-company results under data/extracted/v1/.

Usage (from backend/):
    python scripts/batch_extract_v1.py
    python scripts/batch_extract_v1.py --use-cache
    python scripts/batch_extract_v1.py --pdf-dir ../data
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.models.enums import ExtractionField
from app.services.extraction.parsers import extract_table_hits, extract_text_hits
from app.services.pdf_extraction.service import PDFExtractionService
from app.services.retrieval.service import RetrievalService
from app.utils.files import derive_company_from_filename, ensure_dir

DEFAULT_PDF_DIR = BACKEND_DIR.parent / "data"
V1_OUTPUT_DIR = BACKEND_DIR / "app" / "data" / "extracted" / "v1"

# pdf filename -> (storage slug in data/pdfs/, output json prefix)
PDF_REGISTRY: dict[str, tuple[str, str]] = {
    "adbe-2024-annual-report.pdf": ("adbe", "adobe"),
    "Amazon-2024-Annual-Report.pdf": ("amazon", "amazon"),
    "APPLE_FY24_Q4_Consolidated_Financial_Statements.pdf": ("apple", "apple"),
    "NASDAQ_META_2024.pdf": ("meta", "meta"),
    "Nvidia-2024-annual-report-insert-web-IR-update.pdf": ("nvidia", "nvidia"),
    "Oracle-2024-d92207b0-c016-44ea-a770-4b6f6bb7982e.pdf": ("oracle", "oracle"),
    "salesforce-fy24-annual-report.pdf": ("salesforce", "salesforce"),
    "Netflix-10-K-01272025.pdf": ("netflix", "netflix"),
    "amd-0001193125-25-067185.pdf": ("amd", "amd"),
}


def resolve_pdf(pdf_path: Path) -> tuple[str, str] | None:
    """Return (slug, output_name) for a PDF path."""
    if pdf_path.name in PDF_REGISTRY:
        return PDF_REGISTRY[pdf_path.name]
    slug = derive_company_from_filename(pdf_path.name)
    if not slug or len(slug) > 20 or re.fullmatch(r"[0-9a-f-]{30,}", slug):
        return None
    return slug, slug


async def extract_company(
    pdf_service: PDFExtractionService,
    retrieval_service: RetrievalService,
    slug: str,
    use_cache: bool,
) -> dict[str, list[dict]]:
    pages = await pdf_service.extract_pages(slug, use_cache=use_cache)
    pdf_path = pdf_service.pdf_path_for(slug)
    company_results: dict[str, list[dict]] = {}

    for field in ExtractionField:
        relevant_pages = await retrieval_service.retrieve_relevant_pages(
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

    return company_results


def stage_pdf(pdf_service: PDFExtractionService, source: Path, slug: str) -> Path:
    dest = pdf_service.pdf_path_for(slug)
    if not dest.exists() or source.stat().st_mtime > dest.stat().st_mtime:
        shutil.copy2(source, dest)
    return dest


async def run_batch(pdf_dir: Path, use_cache: bool) -> None:
    ensure_dir(V1_OUTPUT_DIR)
    pdf_service = PDFExtractionService()
    retrieval_service = RetrievalService()

    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {pdf_dir}")
        return

    combined: dict[str, dict] = {}
    manifest: list[dict] = []

    for pdf_path in pdf_files:
        resolved = resolve_pdf(pdf_path)
        if resolved is None:
            print(f"SKIP  {pdf_path.name} (unknown slug)")
            continue

        slug, output_name = resolved
        output_file = V1_OUTPUT_DIR / f"{output_name}_results.json"

        print(f"EXTRACT  {pdf_path.name} -> {output_name}_results.json (slug={slug})")
        stage_pdf(pdf_service, pdf_path, slug)

        try:
            company_results = await extract_company(
                pdf_service, retrieval_service, slug, use_cache=use_cache
            )
        except Exception as exc:
            print(f"ERROR  {pdf_path.name}: {exc}")
            continue

        payload = {
            "company": slug,
            "output_name": output_name,
            "source_pdf": pdf_path.name,
            "fields": company_results,
        }
        output_file.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        combined[slug] = company_results
        manifest.append(
            {
                "slug": slug,
                "output_name": output_name,
                "source_pdf": pdf_path.name,
                "output_file": output_file.name,
            }
        )
        print(f"  saved {output_file}")

    if combined:
        all_results_path = V1_OUTPUT_DIR / "all_results.json"
        all_results_path.write_text(json.dumps(combined, indent=2) + "\n", encoding="utf-8")
        manifest_path = V1_OUTPUT_DIR / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"\nDone. {len(manifest)} companies -> {V1_OUTPUT_DIR}")
        print(f"Combined: {all_results_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch extract PDFs to extracted/v1/")
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=DEFAULT_PDF_DIR,
        help="Directory containing source PDF files",
    )
    parser.add_argument(
        "--use-cache",
        action="store_true",
        help="Reuse cached page text when available",
    )
    args = parser.parse_args()
    asyncio.run(run_batch(args.pdf_dir.resolve(), use_cache=args.use_cache))


if __name__ == "__main__":
    main()

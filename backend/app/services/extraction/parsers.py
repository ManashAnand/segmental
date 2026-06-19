"""Regex and table parsing for financial values."""

import re
from pathlib import Path

import pdfplumber

NUMBER_PATTERN = re.compile(r"\(?\$?[\d,]+(?:\.\d+)?\)?")

FIELD_LINE_TERMS: dict[str, list[str]] = {
    "geographic_revenue": [
        "americas",
        "north america",
        "international",
        "europe",
        "asia",
        "geographic",
        "region",
        "revenue",
    ],
    "segment_revenue": [
        "segment",
        "aws",
        "iphone",
        "advertising",
        "cloud",
        "services",
        "revenue",
    ],
    "rnd_expense": [
        "research",
        "development",
        "r&d",
        "technology and content",
        "product development",
    ],
}


def extract_numbers_from_text(text: str) -> list[str]:
    return NUMBER_PATTERN.findall(text)


def extract_text_hits(text: str, field: str) -> list[dict]:
    """Extract numbers from lines that look relevant to the target field."""
    terms = FIELD_LINE_TERMS.get(field, [])
    hits: list[dict] = []
    for line in text.splitlines():
        lower = line.lower()
        if not any(term in lower for term in terms):
            continue
        numbers = extract_numbers_from_text(line)
        if numbers:
            hits.append({"line": line.strip(), "numbers": numbers})
    return hits


def extract_table_hits(pdf_path: Path, page_number: int) -> list[dict]:
    """Extract numbers from tables on a specific PDF page."""
    hits: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        if page_number < 1 or page_number > len(pdf.pages):
            return hits
        page = pdf.pages[page_number - 1]
        for table in page.extract_tables() or []:
            numbers: list[str] = []
            for row in table:
                for cell in row or []:
                    if cell:
                        numbers.extend(extract_numbers_from_text(str(cell)))
            if numbers:
                hits.append({"numbers": numbers})
    return hits

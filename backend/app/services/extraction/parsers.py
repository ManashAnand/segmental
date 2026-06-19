"""Regex and table parsing for financial values."""

import re
from pathlib import Path

import pdfplumber

from app.services.evaluation.numbers import filter_raw_tokens

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


def _line_for_number_extraction(line: str) -> str | None:
    """
    Prepare a line for number extraction.

    Returns None when the line should be skipped entirely (pure percentage rows).
    Strips trailing growth-rate text after '%' on mixed financial lines.
    """
    lower = line.lower()
    if "percentage" in lower and "$" not in line:
        return None
    if "%" in line:
        return line.split("%", 1)[0]
    return line


def extract_numbers_from_text(text: str) -> list[str]:
    raw = NUMBER_PATTERN.findall(text)
    return filter_raw_tokens(raw)


def extract_text_hits(text: str, field: str) -> list[dict]:
    """Extract numbers from lines that look relevant to the target field."""
    terms = FIELD_LINE_TERMS.get(field, [])
    hits: list[dict] = []
    for line in text.splitlines():
        lower = line.lower()
        if not any(term in lower for term in terms):
            continue
        extractable = _line_for_number_extraction(line)
        if extractable is None:
            continue
        numbers = extract_numbers_from_text(extractable)
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
                        cell_text = str(cell)
                        if "%" in cell_text and "$" not in cell_text and "percentage" in cell_text.lower():
                            continue
                        extractable = cell_text.split("%", 1)[0] if "%" in cell_text else cell_text
                        numbers.extend(extract_numbers_from_text(extractable))
            numbers = filter_raw_tokens(numbers)
            if numbers:
                hits.append({"numbers": numbers})
    return hits

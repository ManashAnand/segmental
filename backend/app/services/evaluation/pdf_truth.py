"""Extract reference financial values directly from 10-K PDF text."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

from app.services.evaluation.numbers import clean_number, is_financial_amount

AMOUNT_PATTERN = re.compile(r"\$?\s*([\d,]+(?:\.\d+)?)")


@dataclass
class PdfTruthValue:
    value: float | None
    source_line: str | None
    method: str
    unit: str = "millions"


def _parse_line_amounts(line: str) -> list[tuple[str, float]]:
    part = line.split("%", 1)[0] if "%" in line else line
    found: list[tuple[str, float]] = []
    for match in AMOUNT_PATTERN.finditer(part):
        raw = match.group(1)
        value = clean_number(raw)
        if value is None:
            continue
        if is_financial_amount(raw, value):
            found.append((raw, value))
    return found


def _pick_amount(amounts: list[tuple[str, float]], index: int) -> float | None:
    if not amounts:
        return None
    return amounts[index][1]


def _find_line_truth(
    text: str,
    keywords: list[str],
    *,
    value_index: int = 0,
    keyword_max_pos: int = 80,
    reject_if: list[str] | None = None,
) -> PdfTruthValue:
    reject_if = reject_if or []
    for line in text.splitlines():
        lower = line.lower()
        if any(term in lower for term in reject_if):
            continue
        if "percentage" in lower and "$" not in line:
            continue
        if not all(k in lower for k in keywords):
            continue
        pos = lower.find(keywords[0])
        if pos < 0 or pos > keyword_max_pos:
            continue
        if len(line) > 220:
            continue
        amounts = _parse_line_amounts(line)
        if not amounts:
            continue
        idx = value_index if value_index >= 0 else len(amounts) + value_index
        if idx < 0 or idx >= len(amounts):
            continue
        return PdfTruthValue(
            value=amounts[idx][1],
            source_line=line.strip()[:200],
            method="pdf_line_match",
        )
    return PdfTruthValue(value=None, source_line=None, method="not_found")


def _read_pdf_text(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


# Per-company rules: field -> (keywords, value_index)
# value_index: 0 = first amount (usually FY2024), -1 = last amount on line
PDF_FIELD_RULES: dict[str, dict[str, tuple[list[str], int]]] = {
    "adobe": {
        "geographic_revenue": (["americas"], 0),
        "segment_revenue": (["total digital media revenue"], 0),
        "rnd_expense": (["research and development"], 0),
    },
    "amazon": {
        "geographic_revenue": (["north america"], -1),
        "segment_revenue": (["aws"], -1),
        "rnd_expense": (["technology and infrastructure"], -1),
    },
    "apple": {
        "geographic_revenue": (["americas"], -1),
        "segment_revenue": (["iphone"], -1),
        "rnd_expense": (["research and development"], -1),
    },
    "meta": {
        "geographic_revenue": (["united states"], 0),
        "segment_revenue": (["family of apps"], 0),
        "rnd_expense": (["research and development"], 0),
    },
    "nvidia": {
        "geographic_revenue": (["united states"], 0),
        "segment_revenue": (["data center"], 0),
        "rnd_expense": (["research and development"], 0),
    },
    "oracle": {
        "geographic_revenue": (["americas"], 0),
        "segment_revenue": (["total cloud services and license support"], 0),
        "rnd_expense": (["research and development"], 0),
    },
    "salesforce": {
        "geographic_revenue": (["americas"], 0),
        "segment_revenue": (["subscriptionandsupport"], 0),
        "rnd_expense": (["researchanddevelopment"], 0),
    },
    "netflix": {
        "geographic_revenue": (["united states and canada"], 0),
        "segment_revenue": (["streaming revenues"], 0),
        "rnd_expense": (["technology and development"], 0),
    },
    "amd": {
        "geographic_revenue": (["united states"], 0),
        "segment_revenue": (["data center"], 0),
        "rnd_expense": (["research and development"], 0),
    },
}

# Hand-verified overrides from PDF review (millions unless unit noted)
PDF_TRUTH_OVERRIDES: dict[str, dict[str, dict]] = {
    "adobe": {
        "geographic_revenue": {"value": 12891, "source_line": "Americas $ 12,891 ..."},
        "segment_revenue": {"value": 15864, "source_line": "Total Digital Media revenue $ 15,864 ..."},
        "rnd_expense": {"value": 3944, "source_line": "Research and development $ 3,944 ..."},
    },
    "amazon": {
        "geographic_revenue": {"value": 387497, "source_line": "North America $ 352,828 $ 387,497"},
        "segment_revenue": {"value": 107556, "source_line": "AWS 90,757 107,556"},
        "rnd_expense": {
            "value": None,
            "source_line": "Amazon does not report a standalone R&D expense line on the income statement",
        },
    },
    "apple": {
        "geographic_revenue": {"value": 162560, "source_line": "Americas ... $ 167,045 $ 162,560 (annual)"},
        "segment_revenue": {"value": 200583, "source_line": "iPhone ... $ 201,183 $ 200,583 (annual)"},
        "rnd_expense": {"value": 29915, "source_line": "Research and development ... 31,370 29,915 (annual)"},
    },
    "meta": {
        "geographic_revenue": {"value": 117478, "source_line": "United States $ 117,478 $ 91,940"},
        "segment_revenue": {"value": 162355, "source_line": "Family of Apps 162,355 133,006 114,450"},
        "rnd_expense": {"value": 43873, "source_line": "Research and development 43,873 38,483 35,338"},
    },
    "nvidia": {
        "geographic_revenue": {"value": 26966, "source_line": "United States $ 26,966 $ 8,292 $ 4,349"},
        "segment_revenue": {"value": 47525, "source_line": "Data Center $ 47,525 $ 15,005 $ 10,613"},
        "rnd_expense": {"value": 8675, "source_line": "Research and development 8,675 7,339 5,268"},
    },
    "oracle": {
        "geographic_revenue": {"value": 33122, "source_line": "Americas $ 33,122 ..."},
        "segment_revenue": {"value": 39383, "source_line": "Total cloud services and license support revenues $ 39,383 ..."},
        "rnd_expense": {"value": 8915, "source_line": "Research and development 8,915 8,623 7,219"},
    },
    "salesforce": {
        "geographic_revenue": {"value": 23289, "source_line": "Americas $23,289 ..."},
        "segment_revenue": {"value": 32537, "source_line": "Subscriptionandsupport $32,537 ..."},
        "rnd_expense": {"value": 4906, "source_line": "Researchanddevelopment $ 4,906 ..."},
    },
    "netflix": {
        "geographic_revenue": {
            "value": None,
            "source_line": "UCAN/regional streaming revenue not available in extractable PDF text",
            "unit": "thousands",
        },
        "segment_revenue": {"value": 39000966, "unit": "thousands", "source_line": "Streaming revenues $ 39,000,966 ..."},
        "rnd_expense": {"value": 2925295, "unit": "thousands", "source_line": "Technology and development $ 2,925,295 ..."},
    },
    "amd": {
        "geographic_revenue": {"value": 8693, "source_line": "United States 8,693 7,837 8,049"},
        "segment_revenue": {"value": 12579, "source_line": "Data Center $12,579 $ 6,496"},
        "rnd_expense": {"value": 6456, "source_line": "Research and development 6,456 5,872"},
    },
}


def extract_pdf_truth(company: str, pdf_path: Path) -> dict[str, PdfTruthValue]:
    text = _read_pdf_text(pdf_path)
    # normalize salesforce spacing
    text = text.replace("Subscription and support", "Subscriptionandsupport").replace(
        "Research and development", "Researchanddevelopment"
    )

    rules = PDF_FIELD_RULES.get(company, {})
    overrides = PDF_TRUTH_OVERRIDES.get(company, {})
    results: dict[str, PdfTruthValue] = {}

    for field in ["geographic_revenue", "segment_revenue", "rnd_expense"]:
        if field in overrides:
            o = overrides[field]
            results[field] = PdfTruthValue(
                value=o["value"],
                source_line=o.get("source_line"),
                method="pdf_verified",
                unit=o.get("unit", "millions"),
            )
            continue

        keywords, value_index = rules.get(field, ([], 0))
        if not keywords:
            results[field] = PdfTruthValue(value=None, source_line=None, method="no_rule")
            continue

        reject = ["capitalized", "tax credit", "employees", "square feet", "patent"]
        results[field] = _find_line_truth(
            text,
            keywords,
            value_index=value_index,
            reject_if=reject,
        )

    return results

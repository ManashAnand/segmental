"""Numeric parsing helpers for extraction candidates."""

import re

YEAR_MIN = 2018
YEAR_MAX = 2030

THOUSANDS_COMMA_PATTERN = re.compile(r"\d{1,3},\d{3}")


def clean_number(raw: str) -> float | None:
    """Parse a financial string into a float; return None on failure."""
    try:
        normalized = (
            raw.replace(",", "")
            .replace("$", "")
            .replace("(", "-")
            .replace(")", "")
            .strip()
        )
        if not normalized or normalized == "-":
            return None
        return float(normalized)
    except (ValueError, AttributeError):
        return None


def is_year_number(value: float) -> bool:
    """True for fiscal year values like 2022, 2023, 2024."""
    return YEAR_MIN <= value <= YEAR_MAX and value == int(value)


def has_thousands_separator(raw: str) -> bool:
    """True for financial-style grouping like 12,891 — not date fragments like 29,"""
    return bool(THOUSANDS_COMMA_PATTERN.search(raw))


def is_financial_amount(raw: str, value: float) -> bool:
    """
    Keep dollar amounts in millions/thousands; drop years and small noise.

    - Years (2018-2030) are dropped.
    - Values with thousands commas are kept (e.g. 12,891).
    - Absolute values >= 100 are kept (e.g. 275 segment revenue).
    - Small integers without thousands commas (11, 74, 7) are dropped.
    """
    if is_year_number(value):
        return False
    if has_thousands_separator(raw):
        return True
    if abs(value) >= 100:
        return True
    return False


def filter_raw_tokens(raw_numbers: list[str]) -> list[str]:
    """Filter raw number strings before storing as candidates."""
    kept: list[str] = []
    for raw in raw_numbers:
        value = clean_number(raw)
        if value is None:
            continue
        if is_financial_amount(raw, value):
            kept.append(raw)
    return kept


def filter_candidates(values: list[float]) -> list[float]:
    """Filter parsed float candidates (years + small noise)."""
    kept: list[float] = []
    for value in values:
        raw = str(int(value)) if value == int(value) else str(value)
        if is_financial_amount(raw, value):
            kept.append(value)
    return kept


def best_guess_number(field_results: list[dict]) -> list[float]:
    """
    Flatten all candidate numbers found across pages for one field.

    Expects field_results entries shaped like:
      {"table_hits": [{"numbers": [...]}], "text_hits": [{"numbers": [...]}]}
    """
    nums: list[str] = []
    for result in field_results:
        for hit in result.get("table_hits", []):
            nums.extend(hit.get("numbers", []))
        for hit in result.get("text_hits", []):
            nums.extend(hit.get("numbers", []))

    cleaned: list[float] = []
    for raw in nums:
        parsed = clean_number(str(raw))
        if parsed is None:
            continue
        if is_financial_amount(str(raw), parsed):
            cleaned.append(parsed)
    return cleaned

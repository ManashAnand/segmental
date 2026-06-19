"""Numeric parsing helpers for extraction candidates."""


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
        return float(normalized)
    except (ValueError, AttributeError):
        return None


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
        if parsed is not None:
            cleaned.append(parsed)
    return cleaned

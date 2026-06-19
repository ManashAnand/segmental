"""Extraction results loading."""

import json
from pathlib import Path


def load_results(path: Path) -> dict:
    """Load extraction results JSON keyed by company -> field -> page hits."""
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)

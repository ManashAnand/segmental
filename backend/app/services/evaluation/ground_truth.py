"""Ground truth CSV loading."""

import csv
from pathlib import Path

from app.services.evaluation.numbers import clean_number


def load_ground_truth(path: Path) -> dict[tuple[str, str], float]:
    """
    Load ground truth CSV with columns: company, field, value.

    Returns a mapping of (company, field) -> numeric value.
    """
    ground_truth: dict[tuple[str, str], float] = {}
    with path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            value = clean_number(row["value"])
            if value is None:
                continue
            ground_truth[(row["company"], row["field"])] = value
    return ground_truth

"""Core evaluation logic."""

from app.services.evaluation.numbers import best_guess_number


def extract_candidates(results: dict) -> list[dict]:
    """
    Build a candidate preview from extraction results without ground truth.

    Returns one row per (company, field) found in results.
    """
    report: list[dict] = []
    for company, fields in results.items():
        if not isinstance(fields, dict):
            continue
        for field, field_results in fields.items():
            candidates = best_guess_number(field_results if isinstance(field_results, list) else [])
            report.append(
                {
                    "company": company,
                    "field": field,
                    "candidates": candidates,
                    "match": None,
                    "true": None,
                }
            )
    return report


def evaluate_results(
    results: dict,
    ground_truth: dict[tuple[str, str], float],
    tol: float = 0.01,
) -> tuple[float, list[dict]]:
    """
    Compare extracted candidates against ground truth.

    A field counts as correct when any candidate is within `tol` relative error.
    """
    correct = 0
    total = 0
    report: list[dict] = []

    for (company, field), true_val in ground_truth.items():
        total += 1
        field_results = results.get(company, {}).get(field, [])
        candidates = best_guess_number(field_results if isinstance(field_results, list) else [])
        match = any(abs(candidate - true_val) / max(abs(true_val), 1) < tol for candidate in candidates)
        if match:
            correct += 1
        report.append(
            {
                "company": company,
                "field": field,
                "true": true_val,
                "candidates": candidates,
                "match": match,
            }
        )

    accuracy = correct / total if total else 0.0
    return accuracy, report

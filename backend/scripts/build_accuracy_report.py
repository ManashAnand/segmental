#!/usr/bin/env python3
"""
Read PDFs, build per-field reference values, and compare against v1 extraction output.

Writes: app/data/extracted/v1/accuracy_report.json

Usage (from backend/):
    python scripts/build_accuracy_report.py
    python scripts/build_accuracy_report.py --pdf-dir ../data
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.evaluation.numbers import best_guess_number
from app.services.evaluation.pdf_truth import extract_pdf_truth
from scripts.batch_extract_v1 import PDF_REGISTRY, V1_OUTPUT_DIR, resolve_pdf

DEFAULT_PDF_DIR = BACKEND_DIR.parent / "data"
FIELD_NAMES = ["geographic_revenue", "segment_revenue", "rnd_expense"]
TOLERANCE = 0.01


def relative_error(expected: float, actual: float) -> float:
    return abs(actual - expected) / max(abs(expected), 1)


def compare_field(
    pdf_truth: float | None,
    candidates: list[float],
    *,
    tolerance: float = TOLERANCE,
) -> dict:
    first_pick = candidates[0] if candidates else None
    first_match = (
        first_pick is not None
        and pdf_truth is not None
        and relative_error(pdf_truth, first_pick) < tolerance
    )
    any_match = (
        pdf_truth is not None
        and any(relative_error(pdf_truth, c) < tolerance for c in candidates)
    )
    return {
        "pdf_truth": pdf_truth,
        "first_pick": first_pick,
        "first_pick_match": first_match,
        "any_candidate_match": any_match,
        "top_candidates": candidates[:10],
        "relative_error_first": (
            relative_error(pdf_truth, first_pick)
            if pdf_truth is not None and first_pick is not None
            else None
        ),
    }


def load_extraction_fields(output_name: str) -> dict[str, list[dict]]:
    path = V1_OUTPUT_DIR / f"{output_name}_results.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing extraction file: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload["fields"]


def build_report(pdf_dir: Path) -> dict:
    companies_report: list[dict] = []
    summary = {
        "fields_compared": 0,
        "first_pick_correct": 0,
        "any_match_correct": 0,
        "pdf_truth_missing": 0,
    }

    # Build pdf path lookup from registry
    pdf_by_output: dict[str, Path] = {}
    for filename, (_slug, output_name) in PDF_REGISTRY.items():
        pdf_by_output[output_name] = pdf_dir / filename

    for output_name in sorted(pdf_by_output.keys()):
        pdf_path = pdf_by_output[output_name]
        if not pdf_path.exists():
            continue

        pdf_truth = extract_pdf_truth(output_name, pdf_path)
        try:
            extracted_fields = load_extraction_fields(output_name)
        except FileNotFoundError:
            continue

        field_rows: dict[str, dict] = {}
        for field in FIELD_NAMES:
            truth = pdf_truth[field]
            candidates = best_guess_number(extracted_fields.get(field, []))
            comparison = compare_field(truth.value, candidates)
            comparison["pdf_source_line"] = truth.source_line
            comparison["pdf_truth_method"] = truth.method
            comparison["unit"] = truth.unit
            field_rows[field] = comparison

            if truth.value is None:
                summary["pdf_truth_missing"] += 1
            else:
                summary["fields_compared"] += 1
                if comparison["first_pick_match"]:
                    summary["first_pick_correct"] += 1
                if comparison["any_candidate_match"]:
                    summary["any_match_correct"] += 1

        companies_report.append(
            {
                "company": output_name,
                "slug": PDF_REGISTRY[pdf_path.name][0],
                "source_pdf": pdf_path.name,
                "extraction_file": f"{output_name}_results.json",
                "fields": field_rows,
            }
        )

    fc = summary["fields_compared"]
    summary["first_pick_accuracy"] = summary["first_pick_correct"] / fc if fc else 0.0
    summary["any_match_accuracy"] = summary["any_match_correct"] / fc if fc else 0.0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pipeline_version": "v1",
        "tolerance": TOLERANCE,
        "summary": summary,
        "companies": companies_report,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build extraction vs PDF accuracy report")
    parser.add_argument("--pdf-dir", type=Path, default=DEFAULT_PDF_DIR)
    parser.add_argument(
        "--output",
        type=Path,
        default=V1_OUTPUT_DIR / "accuracy_report.json",
    )
    args = parser.parse_args()

    report = build_report(args.pdf_dir.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    s = report["summary"]
    print(f"Wrote {args.output}")
    print(
        f"First-pick accuracy: {s['first_pick_correct']}/{s['fields_compared']} "
        f"({s['first_pick_accuracy']:.1%})"
    )
    print(
        f"Any-match accuracy:  {s['any_match_correct']}/{s['fields_compared']} "
        f"({s['any_match_accuracy']:.1%})"
    )


if __name__ == "__main__":
    main()

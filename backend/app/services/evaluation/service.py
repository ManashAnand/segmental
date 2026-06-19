"""Evaluation service implementation."""

from pathlib import Path

from fastapi import HTTPException, status

from app.models.enums import ExtractionVersion
from app.models.evaluation import EvaluationMetrics
from app.schemas.evaluation import EvaluateRequest, EvaluateResponse, EvaluationReportItem, MetricsResponse
from app.services.evaluation.evaluator import evaluate_results, extract_candidates
from app.services.evaluation.ground_truth import load_ground_truth
from app.services.evaluation.loader import load_results
from app.services.evaluation.interface import EvaluationServiceInterface
from app.utils.config import get_settings


class EvaluationService(EvaluationServiceInterface):
    DEFAULT_RESULTS_FILE = "results.json"
    DEFAULT_GROUND_TRUTH_FILE = "ground_truth.csv"
    DEFAULT_TOLERANCE = 0.01

    def __init__(self) -> None:
        self.settings = get_settings()
        self.ground_truth_dir = self.settings.ground_truth_dir
        self.extracted_dir = self.settings.extracted_dir

    def _results_path(self, results_file: str | None) -> Path:
        return self.extracted_dir / (results_file or self.DEFAULT_RESULTS_FILE)

    def _ground_truth_path(self, ground_truth_file: str | None) -> Path:
        return self.ground_truth_dir / (ground_truth_file or self.DEFAULT_GROUND_TRUTH_FILE)

    async def evaluate(self, request: EvaluateRequest) -> EvaluateResponse:
        results_path = self._results_path(request.results_file)
        if not results_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Results file not found: {results_path.name}",
            )

        results = load_results(results_path)
        ground_truth_path = self._ground_truth_path(request.ground_truth_file)

        if ground_truth_path.exists():
            ground_truth = load_ground_truth(ground_truth_path)
            accuracy, raw_report = evaluate_results(
                results=results,
                ground_truth=ground_truth,
                tol=request.tolerance,
            )
            metrics = EvaluationMetrics(
                version=request.version,
                overall_accuracy=accuracy,
                exact_match_pct=accuracy * 100,
                total_comparisons=len(raw_report),
                passed_comparisons=sum(1 for row in raw_report if row["match"]),
            )
            message = f"Evaluated against ground truth: {accuracy:.1%} accuracy"
        else:
            raw_report = extract_candidates(results)
            metrics = EvaluationMetrics(version=request.version)
            message = "Ground truth not available; returning candidate preview only"

        report = [EvaluationReportItem(**row) for row in raw_report]
        return EvaluateResponse(
            version=request.version,
            metrics=metrics,
            report=report,
            message=message,
        )

    async def get_metrics(
        self,
        version: ExtractionVersion | None = None,
    ) -> MetricsResponse:
        # Re-run evaluation when ground truth is present; otherwise return empty metrics.
        target_version = version or ExtractionVersion.V1
        results_path = self._results_path(self.DEFAULT_RESULTS_FILE)
        ground_truth_path = self._ground_truth_path(self.DEFAULT_GROUND_TRUTH_FILE)

        if not results_path.exists():
            return MetricsResponse()

        results = load_results(results_path)
        if not ground_truth_path.exists():
            return MetricsResponse()

        accuracy, _ = evaluate_results(results, load_ground_truth(ground_truth_path))
        metrics = EvaluationMetrics(
            version=target_version,
            overall_accuracy=accuracy,
            exact_match_pct=accuracy * 100,
        )

        if target_version == ExtractionVersion.V1:
            return MetricsResponse(v1=metrics)
        return MetricsResponse(v2=metrics)

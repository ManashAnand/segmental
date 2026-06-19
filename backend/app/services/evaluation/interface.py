"""Evaluation service."""

from abc import ABC, abstractmethod

from app.models.enums import ExtractionVersion
from app.schemas.evaluation import EvaluateRequest, EvaluateResponse, MetricsResponse


class EvaluationServiceInterface(ABC):
    @abstractmethod
    async def evaluate(self, request: EvaluateRequest) -> EvaluateResponse:
        raise NotImplementedError

    @abstractmethod
    async def get_metrics(
        self,
        version: ExtractionVersion | None = None,
    ) -> MetricsResponse:
        raise NotImplementedError

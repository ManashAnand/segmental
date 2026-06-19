"""FastAPI dependency injection providers."""

from functools import lru_cache

from app.services.error_analysis.service import ErrorAnalysisService
from app.services.evaluation.service import EvaluationService
from app.services.extraction.service import ExtractionService
from app.services.pdf_extraction.service import PDFExtractionService
from app.services.retrieval.service import RetrievalService


@lru_cache
def get_pdf_extraction_service() -> PDFExtractionService:
    return PDFExtractionService()


@lru_cache
def get_retrieval_service() -> RetrievalService:
    return RetrievalService()


@lru_cache
def get_extraction_service() -> ExtractionService:
    return ExtractionService(
        pdf_service=get_pdf_extraction_service(),
        retrieval_service=get_retrieval_service(),
    )


@lru_cache
def get_evaluation_service() -> EvaluationService:
    return EvaluationService()


@lru_cache
def get_error_analysis_service() -> ErrorAnalysisService:
    return ErrorAnalysisService()

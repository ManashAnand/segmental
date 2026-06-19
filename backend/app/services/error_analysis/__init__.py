"""Error analysis service package."""

from app.services.error_analysis.interface import ErrorAnalysisServiceInterface
from app.services.error_analysis.service import ErrorAnalysisService

__all__ = ["ErrorAnalysisService", "ErrorAnalysisServiceInterface"]

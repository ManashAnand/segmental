"""POST /evaluate — compare extractions against ground truth."""

from fastapi import APIRouter, Depends

from app.schemas.evaluation import EvaluateRequest, EvaluateResponse
from app.services.evaluation.service import EvaluationService
from app.utils.dependencies import get_evaluation_service

router = APIRouter()


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_extractions(
    request: EvaluateRequest,
    evaluation_service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluateResponse:
    """
  Execution flow:
  1. Load extracted results for version
  2. Load ground truth CSV from data/ground_truth/
  3. Compute exact match %, relative error %, field accuracy, overall accuracy
  4. Persist evaluation output
  """
    return await evaluation_service.evaluate(request)

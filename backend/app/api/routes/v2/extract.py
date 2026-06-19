"""POST /api/v2/extract — assignment: geo + segment + R&D (optional batch endpoint)."""

from fastapi import APIRouter, Depends

from app.schemas.v2 import V2ExtractRequest, V2ExtractResponse
from app.services.agent.service import QueryAgent
from app.services.llm.factory import get_llm_provider
from app.utils.dependencies import get_query_agent

router = APIRouter()


@router.post("/extract", response_model=V2ExtractResponse)
async def extract_assignment_metrics(
    request: V2ExtractRequest,
    agent: QueryAgent = Depends(get_query_agent),
) -> V2ExtractResponse:
    """Extract the three assignment fields in one call (for evaluation)."""
    extraction = await agent.extract_assignment_metrics(company=request.company)
    return V2ExtractResponse(
        company=request.company,
        llm_provider=get_llm_provider().name,
        extraction=extraction,
    )

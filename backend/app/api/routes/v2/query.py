"""POST /api/v2/query — answer any question from the embedded filing."""

from fastapi import APIRouter, Depends

from app.schemas.v2 import V2QueryRequest, V2QueryResponse
from app.services.agent.service import QueryAgent
from app.services.llm.factory import get_llm_provider
from app.utils.dependencies import get_query_agent

router = APIRouter()


@router.post("/query", response_model=V2QueryResponse)
async def query_filing(
    request: V2QueryRequest,
    agent: QueryAgent = Depends(get_query_agent),
) -> V2QueryResponse:
    """Retrieve relevant chunks and answer the user's question."""
    answer = await agent.query(company=request.company, question=request.question)
    return V2QueryResponse(
        company=request.company,
        question=request.question,
        llm_provider=get_llm_provider().name,
        answer=answer,
    )

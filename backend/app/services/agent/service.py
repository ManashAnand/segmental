"""V2 agent: RAG retrieval + LLM."""

from __future__ import annotations

import logging

from app.services.agent.parser import (
    FilingExtractionAnswer,
    QueryAnswer,
    RetrievedChunkSummary,
    to_filing_extraction,
    to_query_answer,
)
from app.services.agent.prompts import (
    EXTRACT_SYSTEM_PROMPT,
    QUERY_SYSTEM_PROMPT,
    build_extract_user_prompt,
    build_query_user_prompt,
    build_retrieval_query,
    is_analytical_question,
)
from app.utils.config import get_settings
from app.services.llm.interface import LLMProvider
from app.services.retrieval.chunks import ChunkRetrievalService

logger = logging.getLogger(__name__)

_EXTRACT_RETRIEVAL = (
    "consolidated statements of income geographic revenue segment revenue "
    "research and development reportable segments United States Americas"
)


def _chunk_summaries(chunks) -> list[RetrievedChunkSummary]:
    return [
        RetrievedChunkSummary(
            page_number=chunk.page_number,
            score=chunk.score,
            snippet=chunk.text[:240].replace("\n", " ").strip(),
        )
        for chunk in chunks[:5]
    ]


class QueryAgent:
    def __init__(
        self,
        llm_provider: LLMProvider,
        chunk_retrieval: ChunkRetrievalService,
    ) -> None:
        self.llm_provider = llm_provider
        self.chunk_retrieval = chunk_retrieval

    async def query(self, company: str, question: str) -> QueryAnswer:
        settings = get_settings()
        retrieval_query = build_retrieval_query(company, question)
        top_k = settings.retrieval_top_k
        if is_analytical_question(question):
            top_k = min(top_k * 2, 16)

        chunks = await self.chunk_retrieval.retrieve_chunks(
            company=company,
            query=retrieval_query,
            top_k=top_k,
        )

        if not chunks:
            return QueryAnswer(
                answer="No embedded chunks found. Upload this company via POST /api/v2/upload first.",
                llm_provider=self.llm_provider.name,
            )

        user_prompt = build_query_user_prompt(company, question, chunks)
        raw = await self.llm_provider.complete(QUERY_SYSTEM_PROMPT, user_prompt, json_mode=True)
        scores = [chunk.score for chunk in chunks]

        try:
            answer = to_query_answer(raw, self.llm_provider.name, scores, len(chunks))
        except Exception as exc:
            logger.warning("Failed to parse query JSON for %s: %s", company, exc)
            return QueryAnswer(
                answer=f"Could not parse LLM response: {exc}",
                raw_response=raw,
                llm_provider=self.llm_provider.name,
                retrieval_scores=scores,
                chunks_used=len(chunks),
                retrieved_chunks=_chunk_summaries(chunks),
            )

        answer.retrieved_chunks = _chunk_summaries(chunks)
        return answer

    async def extract_assignment_metrics(self, company: str) -> FilingExtractionAnswer:
        retrieval_query = f"{_EXTRACT_RETRIEVAL} {company.replace('_', ' ')}"
        chunks = await self.chunk_retrieval.retrieve_chunks(
            company=company,
            query=retrieval_query,
        )

        if not chunks:
            return FilingExtractionAnswer(
                company_name=company,
                llm_provider=self.llm_provider.name,
            )

        user_prompt = build_extract_user_prompt(company, chunks)
        raw = await self.llm_provider.complete(EXTRACT_SYSTEM_PROMPT, user_prompt, json_mode=True)
        scores = [chunk.score for chunk in chunks]

        try:
            return to_filing_extraction(raw, self.llm_provider.name, scores, len(chunks))
        except Exception as exc:
            logger.warning("Failed to parse extract JSON for %s: %s", company, exc)
            return FilingExtractionAnswer(
                company_name=company,
                raw_response=raw,
                llm_provider=self.llm_provider.name,
                retrieval_scores=scores,
                chunks_used=len(chunks),
            )

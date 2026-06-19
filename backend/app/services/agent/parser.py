"""Parse LLM JSON responses."""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, Field


class MetricField(BaseModel):
    label: str | None = None
    value: float | None = None
    fiscal_year: str | None = None
    source_text: str | None = None


class RetrievedChunkSummary(BaseModel):
    page_number: int
    score: float
    snippet: str


class QueryAnswer(BaseModel):
    answer: str = "No answer could be determined from the retrieved context."
    label: str | None = None
    value: float | None = None
    unit: str | None = None
    fiscal_year: str | None = None
    source_text: str | None = None
    raw_response: str | None = None
    llm_provider: str | None = None
    retrieval_scores: list[float] = Field(default_factory=list)
    chunks_used: int = 0
    retrieved_chunks: list[RetrievedChunkSummary] = Field(default_factory=list)


class FilingExtractionAnswer(BaseModel):
    company_name: str | None = None
    geographic_revenue: MetricField = Field(default_factory=MetricField)
    segment_revenue: MetricField = Field(default_factory=MetricField)
    research_and_development_expense: MetricField = Field(default_factory=MetricField)
    raw_response: str | None = None
    llm_provider: str | None = None
    retrieval_scores: list[float] = Field(default_factory=list)
    chunks_used: int = 0


def parse_agent_json(raw: str) -> dict[str, Any]:
    return json.loads(_extract_json_blob(raw))


def to_query_answer(
    raw: str,
    llm_provider: str,
    scores: list[float],
    chunks_used: int,
) -> QueryAnswer:
    data = parse_agent_json(raw)
    value = _coerce_float(data.get("value"))
    answer_text = data.get("answer")
    if not answer_text and value is not None:
        label = data.get("label") or "value"
        unit = data.get("unit") or ""
        year = data.get("fiscal_year") or ""
        answer_text = f"{label}: {value:,.0f} {unit} ({year})".strip()
    elif not answer_text:
        answer_text = "The retrieved context does not contain a clear answer to this question."

    return QueryAnswer(
        answer=str(answer_text),
        label=data.get("label"),
        value=value,
        unit=data.get("unit"),
        fiscal_year=_coerce_str(data.get("fiscal_year")),
        source_text=data.get("source_text"),
        raw_response=raw,
        llm_provider=llm_provider,
        retrieval_scores=scores,
        chunks_used=chunks_used,
    )


def to_filing_extraction(
    raw: str,
    llm_provider: str,
    scores: list[float],
    chunks_used: int,
) -> FilingExtractionAnswer:
    data = parse_agent_json(raw)
    return FilingExtractionAnswer(
        company_name=data.get("company_name"),
        geographic_revenue=_parse_metric_field(data.get("geographic_revenue")),
        segment_revenue=_parse_metric_field(data.get("segment_revenue")),
        research_and_development_expense=_parse_metric_field(
            data.get("research_and_development_expense")
        ),
        raw_response=raw,
        llm_provider=llm_provider,
        retrieval_scores=scores,
        chunks_used=chunks_used,
    )


def _parse_metric_field(raw: Any) -> MetricField:
    if not isinstance(raw, dict):
        return MetricField()
    return MetricField(
        label=raw.get("label"),
        value=_coerce_float(raw.get("value")),
        fiscal_year=_coerce_str(raw.get("fiscal_year")),
        source_text=raw.get("source_text"),
    )


def _extract_json_blob(raw: str) -> str:
    text = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1)
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        return brace_match.group(0)
    return text


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", "").replace("$", "").strip()
        if not cleaned or cleaned.lower() in {"null", "n/a", "na"}:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _coerce_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None

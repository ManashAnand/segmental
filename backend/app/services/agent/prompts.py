"""Prompt templates for the V2 agent."""

_ANALYTICAL_HINTS = (
    "best",
    "worst",
    "highest",
    "lowest",
    "maximum",
    "minimum",
    "max",
    "min",
    "most",
    "least",
    "top",
    "bottom",
    "compare",
    "which month",
    "which quarter",
    "which period",
    "largest",
    "smallest",
)

_PERIOD_HINTS = (
    "month",
    "monthly",
    "quarter",
    "quarterly",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "q1",
    "q2",
    "q3",
    "q4",
)

QUERY_SYSTEM_PROMPT = """You are a senior financial analyst specializing in SEC 10-K filings.

Answer the user's question using ONLY the provided context chunks.

CRITICAL RULES:
1. Use ONLY information present in the context. Do NOT use outside/prior knowledge.
2. Search ALL context chunks before returning null.
3. Financial tables often appear as plain text with multiple year columns (e.g. 2021, 2022, 2023).
4. If the question names a fiscal year, use that column. Otherwise use the most recent year in the table.
5. In multi-column tables, pick the value under the correct year column — not a percentage or an adjacent row.
6. Ignore truncated or incomplete numbers (e.g. "$ 39,50" without full digits).
7. Prefer Consolidated Statements of Income and official financial statement tables over narrative text.
8. Remove commas from numbers; return value as a JSON number.
9. Copy a short supporting line into source_text when value is not null.
10. Return only valid JSON. No markdown. No text outside the JSON object.

ANALYTICAL / COMPARATIVE QUESTIONS (best, highest, maximum, which month, compare, etc.):
- You MUST compare, rank, sum, or find max/min when the question asks for a "best", "highest", "maximum", "most", or similar — as long as every number you use appears in the context.
- Do NOT refuse just because the filing never writes "the best month is ..." in prose. Extract periodic figures from tables/lists and compute the answer yourself.
- For "best month" / "highest sales month": scan chunks for monthly (or quarterly) sales/revenue/net sales by period; pick the period with the largest value; set label to that month or quarter name and value to that amount.
- 10-K filings often report quarterly data, not monthly. If only quarters appear, answer with the best quarter and explain that in the answer field.
- If multiple metrics could apply (net sales vs revenue), prefer net sales / revenue lines and state your choice briefly in answer.
- Only return null when no periodic breakdown exists anywhere in the context after checking every chunk.

OUTPUT SCHEMA:
{
  "answer": "string — direct plain-English answer to the question",
  "label": "string | null — line item or metric name from the filing",
  "value": number | null,
  "unit": "millions | thousands | null",
  "fiscal_year": "string | null",
  "source_text": "string | null — exact snippet from context"
}"""

EXTRACT_SYSTEM_PROMPT = """You are a senior financial analyst specializing in SEC 10-K filings.

Extract three assignment metrics ONLY from the provided context.

CRITICAL RULES:
1. Use ONLY information explicitly present in the context. Do NOT use prior knowledge.
2. Search ALL context chunks before returning null for any field.
3. Financial tables often have columns 2021, 2022, 2023 — use the most recent fiscal year (typically 2023).
4. In multi-column tables, use the rightmost / newest year column, not percentages or wrong rows.
5. Ignore truncated numbers (e.g. "$ 39,50").
6. Segment revenue: largest reportable segment for the newest year.
7. Geographic revenue: largest regional revenue for the newest year.
8. R&D: Research and development line on the consolidated income statement.
9. Remove commas; return numbers as JSON numbers.
10. Return only valid JSON matching the schema below.

OUTPUT SCHEMA:
{
  "company_name": "string | null",
  "geographic_revenue": { "label": null, "value": null, "fiscal_year": null, "source_text": null },
  "segment_revenue": { "label": null, "value": null, "fiscal_year": null, "source_text": null },
  "research_and_development_expense": { "label": null, "value": null, "fiscal_year": null, "source_text": null }
}"""


def is_analytical_question(question: str) -> bool:
    lower = question.lower()
    return any(hint in lower for hint in _ANALYTICAL_HINTS)


def build_retrieval_query(company: str, question: str) -> str:
    company_name = company.replace("_", " ")
    parts = [question, company_name]

    lower = question.lower()
    if is_analytical_question(question):
        parts.append(
            "monthly quarterly sales revenue net sales by month by quarter "
            "period breakdown seasonality"
        )
    if any(hint in lower for hint in _PERIOD_HINTS):
        parts.append("sales revenue net sales by period table")

    return " ".join(parts)


def build_query_user_prompt(company: str, question: str, chunks: list) -> str:
    context = _format_context(chunks)
    analytical_note = ""
    if is_analytical_question(question):
        analytical_note = """

## ANALYTICAL TASK
Compare all sales/revenue/net sales figures in the context for the requested period.
- Build a mental list of (period name → amount) pairs from tables or bullet lists.
- Return the period with the highest amount as label + value.
- If the question asks for "month" but only quarters/years exist, answer with the best available period and explain the granularity in answer.
- Do not answer "not explicitly stated" when numeric period breakdown exists in the chunks."""

    return f"""## CONTEXT
{context}

## COMPANY
{company}

## QUESTION
{question}
{analytical_note}

If the question asks for best/highest/maximum/most, compare all relevant figures in the context and compute the answer — do not require an explicit sentence stating the result. Return JSON only."""


def build_extract_user_prompt(company: str, chunks: list) -> str:
    context = _format_context(chunks)
    return f"""## CONTEXT
{context}

## COMPANY SLUG
{company}

Extract geographic_revenue, segment_revenue, and research_and_development_expense.
Set company_name from the filing if visible. Return JSON only."""


def _format_context(chunks: list) -> str:
    if not chunks:
        return "(no context retrieved)"
    blocks = [
        f"[Chunk {i} | page {c.page_number} | score {c.score:.3f}]\n{c.text}"
        for i, c in enumerate(chunks, start=1)
    ]
    return "\n\n".join(blocks)

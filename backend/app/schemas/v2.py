"""V2 API request/response schemas."""

from pydantic import BaseModel, ConfigDict, Field

from app.services.agent.parser import FilingExtractionAnswer, QueryAnswer


class V2UploadResponse(BaseModel):
    company: str
    filename: str
    path: str
    chunks_indexed: int
    message: str


class V2QueryRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "company": "alphabet",
                    "question": "What were total Revenues for the year ended December 31, 2023, in millions?",
                }
            ]
        }
    )

    company: str = Field(..., examples=["alphabet"])
    question: str = Field(
        ...,
        description="Your question about the filing — answered directly from retrieved context",
        examples=[
            "What were total Revenues for the year ended December 31, 2023, in millions?"
        ],
    )


class V2QueryResponse(BaseModel):
    company: str
    question: str
    llm_provider: str
    answer: QueryAnswer


class V2ExtractRequest(BaseModel):
    company: str = Field(..., examples=["alphabet"])


class V2ExtractResponse(BaseModel):
    company: str
    llm_provider: str
    extraction: FilingExtractionAnswer


class CompanyInfoResponse(BaseModel):
    company: str
    pdf_available: bool
    indexed: bool
    page_count: int
    chunk_count: int
    filename: str | None = None

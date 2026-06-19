"""Upload endpoint schemas."""

from pydantic import BaseModel, Field

from app.schemas.extraction import ExtractResponse


class UploadRequest(BaseModel):
    company: str | None = Field(
        default=None,
        description="Optional company slug. If omitted, derived from filename (e.g. apple-10k.pdf -> apple).",
    )
    overwrite: bool = Field(default=False, description="Overwrite existing PDF if present")


class SavedPdfResult(BaseModel):
    company: str
    filename: str
    path: str
    message: str


class UploadResponse(BaseModel):
    company: str
    filename: str
    path: str
    message: str
    extraction: ExtractResponse

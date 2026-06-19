"""Retrieved document chunk with similarity score."""

from pydantic import BaseModel


class RetrievedChunk(BaseModel):
    page_number: int
    chunk_index: int
    text: str
    score: float

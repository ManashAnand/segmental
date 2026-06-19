"""FastAPI dependency injection providers."""

from functools import lru_cache

from app.services.agent.service import QueryAgent
from app.services.embedding.service import get_embedding_service
from app.services.extraction.service import ExtractionService
from app.services.extraction.v2_service import V2IngestService
from app.services.ingest.service import IngestService
from app.services.llm.factory import get_llm_provider
from app.services.pdf_extraction.service import PDFExtractionService
from app.services.retrieval.chunks import ChunkRetrievalService
from app.services.retrieval.composite import CompositeRetrievalService
from app.services.retrieval.semantic import SemanticRetrievalService
from app.services.retrieval.service import RetrievalService


@lru_cache
def get_pdf_extraction_service() -> PDFExtractionService:
    return PDFExtractionService()


@lru_cache
def get_keyword_retrieval_service() -> RetrievalService:
    return RetrievalService()


@lru_cache
def get_semantic_retrieval_service() -> SemanticRetrievalService:
    return SemanticRetrievalService(embedding_service=get_embedding_service())


@lru_cache
def get_retrieval_service() -> CompositeRetrievalService:
    return CompositeRetrievalService(
        semantic_service=get_semantic_retrieval_service(),
        keyword_service=get_keyword_retrieval_service(),
    )


@lru_cache
def get_ingest_service() -> IngestService:
    return IngestService(embedding_service=get_embedding_service())


@lru_cache
def get_extraction_service() -> ExtractionService:
    return ExtractionService(
        pdf_service=get_pdf_extraction_service(),
        retrieval_service=get_retrieval_service(),
        ingest_service=get_ingest_service(),
    )


@lru_cache
def get_chunk_retrieval_service() -> ChunkRetrievalService:
    return ChunkRetrievalService(embedding_service=get_embedding_service())


@lru_cache
def get_query_agent() -> QueryAgent:
    return QueryAgent(
        llm_provider=get_llm_provider(),
        chunk_retrieval=get_chunk_retrieval_service(),
    )


@lru_cache
def get_v2_ingest_service() -> V2IngestService:
    return V2IngestService(
        pdf_service=get_pdf_extraction_service(),
        ingest_service=get_ingest_service(),
    )

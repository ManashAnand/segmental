"""Embed document pages and store vectors in Postgres."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from uuid import UUID

from app.db.pool import get_pool
from app.db.vector import vector_literal
from app.models.extraction import PageContent
from app.services.embedding.chunking import chunk_text
from app.services.embedding.service import EmbeddingService
from app.utils.config import get_settings
from app.utils.files import slugify_company

logger = logging.getLogger(__name__)


class IngestService:
    def __init__(self, embedding_service: EmbeddingService) -> None:
        self.embedding_service = embedding_service
        self.settings = get_settings()

    def pdf_sha256(self, pdf_path: Path) -> str:
        return hashlib.sha256(pdf_path.read_bytes()).hexdigest()

    async def has_embeddings(self, company: str) -> bool:
        pool = get_pool()
        if pool is None:
            return False
        slug = slugify_company(company)
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT chunk_count FROM companies WHERE slug = $1",
                slug,
            )
        return bool(row and row["chunk_count"] > 0)

    async def ensure_indexed(
        self,
        company: str,
        pdf_path: Path,
        pages: list[PageContent],
        *,
        force: bool = False,
    ) -> int:
        pool = get_pool()
        if pool is None:
            logger.warning("Skipping embedding ingest for %s: no database", company)
            return 0

        slug = slugify_company(company)
        pdf_sha = self.pdf_sha256(pdf_path)

        if not force:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT pdf_sha256, chunk_count FROM companies WHERE slug = $1",
                    slug,
                )
            if row and row["chunk_count"] > 0 and row["pdf_sha256"] == pdf_sha:
                return row["chunk_count"]

        return await self.ingest(slug, pdf_path.name, pdf_sha, pages)

    async def ingest(
        self,
        company: str,
        pdf_filename: str,
        pdf_sha256: str,
        pages: list[PageContent],
    ) -> int:
        pool = get_pool()
        if pool is None:
            return 0

        slug = slugify_company(company)
        chunk_records: list[tuple[int, int, str]] = []
        for page in pages:
            pieces = chunk_text(
                page.text,
                chunk_size=self.settings.chunk_size,
                overlap=self.settings.chunk_overlap,
            )
            for chunk_index, piece in enumerate(pieces):
                chunk_records.append((page.page_number, chunk_index, piece))

        if not chunk_records:
            logger.warning("No text chunks to embed for %s", slug)
            return 0

        texts = [record[2] for record in chunk_records]
        embeddings: list[list[float]] = []
        batch_size = self.settings.embed_batch_size
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            embeddings.extend(await self.embedding_service.encode(batch))

        async with pool.acquire() as conn:
            async with conn.transaction():
                company_id = await conn.fetchval(
                    """
                    INSERT INTO companies (slug, pdf_filename, pdf_sha256, chunk_count)
                    VALUES ($1, $2, $3, 0)
                    ON CONFLICT (slug) DO UPDATE SET
                      pdf_filename = EXCLUDED.pdf_filename,
                      pdf_sha256 = EXCLUDED.pdf_sha256,
                      updated_at = now()
                    RETURNING id
                    """,
                    slug,
                    pdf_filename,
                    pdf_sha256,
                )
                await conn.execute(
                    "DELETE FROM document_chunks WHERE company_id = $1",
                    company_id,
                )

                insert_sql = """
                  INSERT INTO document_chunks
                    (company_id, page_number, chunk_index, text, embedding)
                  VALUES ($1, $2, $3, $4, $5::vector)
                """
                for (page_number, chunk_index, text), embedding in zip(
                    chunk_records, embeddings, strict=True
                ):
                    await conn.execute(
                        insert_sql,
                        company_id,
                        page_number,
                        chunk_index,
                        text,
                        vector_literal(embedding),
                    )

                await conn.execute(
                    "UPDATE companies SET chunk_count = $2, updated_at = now() WHERE id = $1",
                    company_id,
                    len(chunk_records),
                )

        logger.info("Embedded %s chunks for %s", len(chunk_records), slug)
        return len(chunk_records)

    async def get_company_id(self, company: str) -> UUID | None:
        pool = get_pool()
        if pool is None:
            return None
        slug = slugify_company(company)
        async with pool.acquire() as conn:
            return await conn.fetchval("SELECT id FROM companies WHERE slug = $1", slug)

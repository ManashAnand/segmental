"""Async Postgres connection pool."""

from __future__ import annotations

import logging
from pathlib import Path

import asyncpg

from app.utils.config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None
_schema_path = Path(__file__).with_name("schema.sql")


async def init_pool() -> None:
    global _pool
    settings = get_settings()
    try:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=1,
            max_size=5,
            command_timeout=60,
        )
        await _run_schema()
        logger.info("Postgres pool ready")
    except Exception as exc:
        _pool = None
        logger.warning("Postgres unavailable; semantic retrieval disabled: %s", exc)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool | None:
    return _pool


async def _run_schema() -> None:
    if _pool is None:
        return
    sql = _schema_path.read_text(encoding="utf-8")
    async with _pool.acquire() as conn:
        await conn.execute(sql)

"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.db.pool import close_pool, get_pool, init_pool
from app.services.embedding.service import get_embedding_service
from app.services.llm.factory import get_llm_provider
from app.utils.config import get_settings


@asynccontextmanager
async def lifespan(_application: FastAPI):
    await init_pool()
    try:
        get_embedding_service().preload()
    except Exception:
        pass
    yield
    await close_pool()


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="10-K Financial Report Extraction & Evaluation System",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=settings.api_prefix)

    @application.get("/health")
    async def health() -> dict[str, str | bool]:
        llm = get_llm_provider()
        return {
            "status": "ok",
            "model": settings.model_name,
            "database": get_pool() is not None,
            "llm_provider": llm.name,
        }

    return application


app = create_app()

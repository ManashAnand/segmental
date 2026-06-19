"""FastAPI application factory."""

from fastapi import FastAPI

from app.api.router import api_router
from app.utils.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="10-K Financial Report Extraction & Evaluation System",
    )

    application.include_router(api_router, prefix=settings.api_prefix)

    return application


app = create_app()

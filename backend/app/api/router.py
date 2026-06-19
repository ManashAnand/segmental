"""API route aggregation."""

from fastapi import APIRouter

from app.api.routes import errors, evaluate, extract, metrics, results, upload

api_router = APIRouter()

api_router.include_router(upload.router, tags=["upload"])
api_router.include_router(extract.router, tags=["extract"])
api_router.include_router(evaluate.router, tags=["evaluate"])
api_router.include_router(results.router, tags=["results"])
api_router.include_router(metrics.router, tags=["metrics"])
api_router.include_router(errors.router, tags=["errors"])

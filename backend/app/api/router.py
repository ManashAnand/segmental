"""API route aggregation."""

from fastapi import APIRouter

from app.api.routes.v1 import router as v1_router
from app.api.routes.v2 import router as v2_router

api_router = APIRouter()

api_router.include_router(v1_router, prefix="/v1")
api_router.include_router(v2_router, prefix="/v2")

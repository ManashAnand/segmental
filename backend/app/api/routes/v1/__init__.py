"""V1 API routes."""

from fastapi import APIRouter

from app.api.routes.v1 import upload

router = APIRouter()
router.include_router(upload.router, tags=["v1"])

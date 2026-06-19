"""V2 API — upload + query (any question) + extract (assignment fields)."""

from fastapi import APIRouter

from app.api.routes.v2 import companies, extract, query, upload

router = APIRouter()
router.include_router(upload.router, tags=["v2"])
router.include_router(query.router, tags=["v2"])
router.include_router(extract.router, tags=["v2"])
router.include_router(companies.router, tags=["v2"])

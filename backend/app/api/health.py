"""Health & capability endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.config import settings
from app.core.cache import cache
from app.db.session import engine
from app.schemas.tracking import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """Liveness probe returning provider/database/cache status."""
    db_ok = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:  # pragma: no cover
        db_ok = "error"

    cache_ok = "ok"
    try:
        await cache.set("health", "ok", ttl=5)
        if not await cache.get("health"):
            cache_ok = "degraded"
    except Exception:  # pragma: no cover
        cache_ok = "error"

    return HealthOut(
        status="ok" if db_ok == "ok" else "degraded",
        version=__version__,
        ai_provider=settings.ai_provider,
        database=db_ok,
        cache=cache_ok,
    )

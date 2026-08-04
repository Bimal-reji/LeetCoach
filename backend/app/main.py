"""LeetCoach AI — FastAPI application entry point.

Run locally::

    uvicorn app.main:app --reload --port 8000

The app is fully functional with zero configuration (mock AI, SQLite,
in-memory cache). Configure Groq/Postgres/Redis via ``.env`` to upgrade.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.router import api_router
from app.config import settings
from app.core.cache import cache
from app.core.errors import register_exception_handlers
from app.db.init_db import init_db
from app.db.session import init_engine
from app.logging_conf import configure_logging, get_logger
from app.services.coach import coach
from app.services.rag import retriever

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks for db, cache, AI provider, RAG."""
    configure_logging()
    await init_engine()
    await init_db(seed=True)
    await cache.start()
    await coach.start()
    if settings.rag_enabled:
        retriever.load()
    logger.info("%s v%s ready (AI provider: %s)", settings.app_name, __version__, settings.ai_provider)
    yield
    await coach.close()
    await cache.close()


app = FastAPI(
    title="LeetCoach AI API",
    description="AI coding mentor for LeetCode — hints, patterns, complexity, debugging, review, and revision tracking.",
    version=__version__,
    lifespan=lifespan,
)

# In development, allow any origin (incl. chrome-extension://) so the
# unpacked extension and local dashboard work with zero CORS config.
# Production restricts origins via CORS_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_dev else settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/")
async def root() -> dict:
    """API root with quick links."""
    return {
        "name": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/api/v1/health",
        "ai_provider": settings.ai_provider,
    }

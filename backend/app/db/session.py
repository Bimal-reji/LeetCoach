"""Async SQLAlchemy engine + session factory.

Works with SQLite (``aiosqlite``) out of the box and PostgreSQL
(``asyncpg``) when ``DATABASE_URL`` points at one — e.g. Supabase.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings
from app.logging_conf import get_logger

logger = get_logger(__name__)

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    poolclass=NullPool if settings.database_url.startswith("sqlite") else None,
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding an async database session."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_engine() -> None:
    """Log engine startup (used from app lifespan)."""
    logger.info("Database engine ready: %s", settings.database_url)

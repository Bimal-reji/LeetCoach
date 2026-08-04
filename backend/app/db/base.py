"""Declarative base shared by all ORM models."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    """Timezone-aware UTC now (Python-side default — avoids SQLite's naive CURRENT_TIMESTAMP)."""
    return datetime.now(UTC)


def as_utc(value: Any) -> datetime:
    """Normalize a stored datetime to a timezone-aware UTC value.

    SQLite may return naive UTC timestamps for legacy rows; treat them as UTC
    rather than letting ``astimezone`` interpret them as local time (which
    would shift streak/heatmap boundaries on non-UTC machines).
    """
    if value is None:
        return utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class Base(DeclarativeBase):
    """Base class providing a shared convention for timestamp columns."""

    @classmethod
    def _utcnow(cls) -> datetime:
        return utcnow()


class TimestampMixin:
    """Adds created_at / updated_at columns to a model (Python-side UTC defaults)."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

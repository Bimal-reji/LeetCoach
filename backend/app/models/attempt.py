"""Attempt model — tracks every submission / session a device makes."""

from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Attempt(Base, TimestampMixin):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    problem_slug: Mapped[str] = mapped_column(
        ForeignKey("problems.slug", ondelete="CASCADE"), index=True, nullable=False
    )
    # accepted | wrong | attempted | solved
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(32), default="python", nullable=False)
    code: Mapped[str] = mapped_column(Text, default="", nullable=False)
    error: Mapped[str] = mapped_column(Text, default="", nullable=False)
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)  # solving time
    first_try: Mapped[bool] = mapped_column(default=False, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    problem = relationship("Problem", back_populates="attempts")

"""Problem model — a single LeetCode problem and its extracted metadata."""

from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Problem(Base, TimestampMixin):
    __tablename__ = "problems"

    slug: Mapped[str] = mapped_column(String(255), primary_key=True)
    leetcode_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    pattern_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    examples: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    constraints: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    function_signature: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    attempts = relationship("Attempt", back_populates="problem", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="problem", cascade="all, delete-orphan")

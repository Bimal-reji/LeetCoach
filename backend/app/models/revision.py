"""Revision entry model — observations, patterns, mistakes to revisit."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Revision(Base, TimestampMixin):
    __tablename__ = "revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    problem_slug: Mapped[str | None] = mapped_column(
        ForeignKey("problems.slug", ondelete="SET NULL"), index=True, nullable=True
    )
    # observation | pattern | mistake | tip
    kind: Mapped[str] = mapped_column(String(32), default="observation", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    problem = relationship("Problem")

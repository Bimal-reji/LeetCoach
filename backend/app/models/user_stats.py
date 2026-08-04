"""User-level analytics/statistics per device (auth-free v1 identity)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserStats(Base):
    __tablename__ = "user_stats"

    device_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(128), default="Coder", nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    solved_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_solved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    weak_topics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    strong_topics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

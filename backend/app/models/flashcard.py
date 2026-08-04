"""Flashcard model — spaced-repetition cards generated from solved problems."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

BOX_INTERVALS_DAYS = (0, 1, 3, 7, 14, 30)  # SM-2 lite box schedule


class Flashcard(Base, TimestampMixin):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    problem_slug: Mapped[str | None] = mapped_column(
        ForeignKey("problems.slug", ondelete="SET NULL"), index=True, nullable=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    box: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_review_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    problem = relationship("Problem")

    @classmethod
    def interval_for(cls, box: int) -> int:
        """Next review delay in days for the given box index."""
        return BOX_INTERVALS_DAYS[min(box, len(BOX_INTERVALS_DAYS) - 1)]

    def schedule_next(self, recalled: bool) -> None:
        """Advance the card through spaced-repetition boxes."""
        self.review_count += 1
        if recalled:
            self.box = min(self.box + 1, len(BOX_INTERVALS_DAYS) - 1)
        else:
            self.box = 0
        self.next_review_at = datetime.now(UTC) + timedelta(
            days=Flashcard.interval_for(self.box)
        )

"""Maintains per-device UserStats when attempts are recorded."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import as_utc, utcnow
from app.models.attempt import Attempt
from app.models.problem import Problem
from app.models.user_stats import UserStats

DIFFICULTY_POINTS = {"Easy": 0, "Medium": 5, "Hard": 10}
SOLVED_POINTS = 10
WRONG_POINTS = 1


async def get_or_create_stats(session: AsyncSession, device_id: str) -> UserStats:
    stats = (
        await session.execute(select(UserStats).where(UserStats.device_id == device_id))
    ).scalar_one_or_none()
    if stats is None:
        stats = UserStats(device_id=device_id)
        session.add(stats)
        await session.flush()
    return stats


async def record_attempt(
    session: AsyncSession,
    device_id: str,
    attempt: Attempt,
    problem: Problem,
    first_solve: bool,
) -> UserStats:
    """Apply points, streak, and solved-count updates for one attempt."""
    stats = await get_or_create_stats(session, device_id)
    is_solved = attempt.status in ("accepted", "solved")

    if is_solved:
        # Award points only on the first successful solve (not farmable).
        if first_solve:
            base = SOLVED_POINTS + DIFFICULTY_POINTS.get(problem.difficulty, 0)
            if attempt.first_try:
                base += 5
            stats.points += base
            stats.solved_count += 1

        today = date.today()
        last = as_utc(stats.last_solved_at) if stats.last_solved_at else None
        if last is None:
            stats.streak = 1
        elif last.date() == today:
            pass  # already solved today
        elif last.date() == today - timedelta(days=1):
            stats.streak += 1
        else:
            stats.streak = 1
        stats.longest_streak = max(stats.longest_streak, stats.streak)
        stats.last_solved_at = utcnow()
    else:
        stats.points += WRONG_POINTS

    if attempt.time_ms:
        stats.total_time_ms += attempt.time_ms
    return stats

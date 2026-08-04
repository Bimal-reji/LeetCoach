"""Progress analytics.

Computes solved counts, streaks, topic strengths, and heatmap data from the
attempts table. Used by the Revision Dashboard in both the extension and the
web dashboard.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import as_utc, utcnow
from app.models.attempt import Attempt
from app.models.problem import Problem
from app.models.user_stats import UserStats
from app.schemas.tracking import HeatmapDay, ProgressResponse, TopicStat

TOPIC_WEIGHT = 2.0  # solved counts double vs attempted for strength


async def compute_progress(session: AsyncSession, device_id: str) -> ProgressResponse:
    """Derive the full progress payload for a device."""
    attempts = (
        (
            await session.execute(
                select(Attempt).where(Attempt.device_id == device_id).order_by(Attempt.created_at)
            )
        )
        .scalars()
        .all()
    )

    solved_slugs: set[str] = set()
    attempted_slugs: set[str] = set()
    for a in attempts:
        attempted_slugs.add(a.problem_slug)
        if a.status in ("accepted", "solved"):
            solved_slugs.add(a.problem_slug)

    # Difficulty breakdown of uniquely solved problems (real data).
    problems = {}
    if solved_slugs:
        rows = (
            await session.execute(select(Problem.slug, Problem.difficulty).where(Problem.slug.in_(solved_slugs)))
        ).all()
        problems = {slug: difficulty for slug, difficulty in rows}
    difficulty_counts = Counter(
        problems[slug] for slug in solved_slugs if problems.get(slug)
    )

    # topic stats
    topic_attempts: dict[str, list[Attempt]] = defaultdict(list)
    for a in attempts:
        for tag in a.tags:
            topic_attempts[tag].append(a)

    topics: list[TopicStat] = []
    for topic, items in topic_attempts.items():
        solved = sum(1 for a in items if a.status in ("accepted", "solved"))
        first_try = sum(1 for a in items if a.first_try)
        times = [a.time_ms for a in items if a.time_ms is not None]
        strength = min(1.0, (solved * TOPIC_WEIGHT + first_try) / max(1, len(items) * 2))
        topics.append(
            TopicStat(
                topic=topic,
                attempted=len(items),
                solved=solved,
                first_try_rate=round(first_try / max(1, len(items)), 2),
                avg_time_ms=sum(times) // len(times) if times else None,
                strength=round(strength, 2),
            )
        )
    topics.sort(key=lambda t: t.strength, reverse=True)
    weak = [t.topic for t in topics if t.strength < 0.5][:6]
    strong = [t.topic for t in topics if t.strength >= 0.7][:6]

    # heatmap (last 90 days)
    by_day: Counter[str] = Counter()
    for a in attempts:
        by_day[as_utc(a.created_at).strftime("%Y-%m-%d")] += 1
    today = utcnow().date()
    heatmap = [
        HeatmapDay(date=(today - timedelta(days=i)).isoformat(), count=by_day.get((today - timedelta(days=i)).isoformat(), 0))
        for i in range(89, -1, -1)
    ]

    stats = (
        await session.execute(select(UserStats).where(UserStats.device_id == device_id))
    ).scalar_one_or_none()

    return ProgressResponse(
        solved_count=len(solved_slugs),
        attempted_count=len(attempted_slugs),
        streak=stats.streak if stats else 0,
        longest_streak=stats.longest_streak if stats else 0,
        points=stats.points if stats else 0,
        total_time_ms=sum(a.time_ms or 0 for a in attempts),
        topics=topics,
        weak_topics=weak,
        strong_topics=strong,
        heatmap=heatmap,
        difficulty_counts=dict(difficulty_counts),
    )

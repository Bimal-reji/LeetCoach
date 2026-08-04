"""Daily challenge generator.

Deterministically rotates problems from the knowledge base (one per day),
then personalizes the plan using the device's weak topics from analytics.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.problems import PROBLEMS
from app.models.attempt import Attempt
from app.schemas.ai import DailyChallenge


async def get_daily_challenge(session: AsyncSession, device_id: str) -> DailyChallenge:
    """Pick today's problem and build a personal practice plan."""
    today = date.today()
    # Deterministic rotation: index = days since epoch % len(PROBLEMS)
    problem = PROBLEMS[(today - date(1970, 1, 1)).days % len(PROBLEMS)]

    # Personalize with weak topics.
    attempts = (
        (
            await session.execute(
                select(Attempt).where(Attempt.device_id == device_id)
            )
        )
        .scalars()
        .all()
    )
    topic_tally: dict[str, list[str]] = {}
    for a in attempts:
        for tag in a.tags:
            topic_tally.setdefault(tag, []).append(a.status)

    weak = [
        tag
        for tag, statuses in topic_tally.items()
        if sum(1 for s in statuses if s in ("accepted", "solved")) / len(statuses) < 0.5
    ][:3]

    plan = [
        "Attempt the problem yourself for 20 minutes before reading any hint.",
        f"Core pattern to focus on: {problem.get('pattern', '—').replace('_', ' ').title()}.",
        "After solving, write a revision note in one sentence: what was the key insight?",
    ]
    if weak:
        plan.insert(1, f"Revision targets from your weak spots: {', '.join(weak)} — skim a related concept first.")

    return DailyChallenge(
        date=today.isoformat(),
        problem={**problem, "url": problem["url"]},
        focus_topics=[problem.get("pattern", "")] + weak,
        plan=plan,
        source="mock",
    )

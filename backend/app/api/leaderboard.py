"""Leaderboard (computed from UserStats)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId
from app.db.session import get_session
from app.models.user_stats import UserStats
from app.schemas.tracking import LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])
SessionDep = Depends(get_session)


@router.get("", response_model=list[LeaderboardEntry])
async def leaderboard(
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
    limit: int = 20,
) -> list[LeaderboardEntry]:
    """Top devices by points."""
    rows = (
        (
            await session.execute(
                select(UserStats).order_by(UserStats.points.desc(), UserStats.solved_count.desc()).limit(min(limit, 100))
            )
        )
        .scalars()
        .all()
    )
    return [
        LeaderboardEntry(
            device_id=s.device_id,
            display_name=s.display_name,
            points=s.points,
            solved_count=s.solved_count,
            streak=s.streak,
        )
        for s in rows
    ]

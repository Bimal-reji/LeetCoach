"""Revision dashboard endpoints (stats, streaks, heatmap, topics)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId
from app.db.session import get_session
from app.models.user_stats import UserStats
from app.schemas.tracking import ProgressResponse
from app.services.analytics import compute_progress

router = APIRouter(prefix="/progress", tags=["progress"])
SessionDep = Depends(get_session)


@router.get("", response_model=ProgressResponse)
async def progress(
    device_id: DeviceId, session: AsyncSession = SessionDep
) -> ProgressResponse:
    """Full revision-dashboard payload for the device."""
    return await compute_progress(session, device_id)


@router.put("/profile")
async def update_profile(body: dict, device_id: DeviceId, session: AsyncSession = SessionDep) -> dict:
    """Set the display name shown on the leaderboard."""
    name = str(body.get("display_name", "")).strip()[:128]
    if not name:
        return {"error": "display_name required"}
    stats = (
        await session.execute(select(UserStats).where(UserStats.device_id == device_id))
    ).scalar_one_or_none()
    if stats is None:
        stats = UserStats(device_id=device_id)
        session.add(stats)
    stats.display_name = name
    await session.flush()
    return {"ok": True, "display_name": name}

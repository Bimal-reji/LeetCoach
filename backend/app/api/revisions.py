"""Revision entries CRUD (observations, patterns, mistakes, tips)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId, RateLimitedDeviceId
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.revision import Revision
from app.schemas.tracking import RevisionCreate, RevisionOut

router = APIRouter(prefix="/revisions", tags=["revisions"])
SessionDep = Depends(get_session)


@router.get("", response_model=list[RevisionOut])
async def list_revisions(
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
    kind: str | None = None,
) -> list[RevisionOut]:
    stmt = select(Revision).where(Revision.device_id == device_id).order_by(Revision.created_at.desc())
    if kind:
        stmt = stmt.where(Revision.kind == kind)
    return [RevisionOut.model_validate(r) for r in (await session.execute(stmt)).scalars().all()]


@router.post("", response_model=RevisionOut, status_code=201)
async def create_revision(
    body: RevisionCreate,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> RevisionOut:
    rev = Revision(
        device_id=device_id,
        problem_slug=body.problem_slug or None,
        kind=body.kind,
        content=body.content,
    )
    session.add(rev)
    await session.flush()
    return RevisionOut.model_validate(rev)


@router.delete("/{revision_id}")
async def delete_revision(
    revision_id: int, device_id: DeviceId, session: AsyncSession = SessionDep
) -> dict:
    result = await session.execute(
        delete(Revision).where(Revision.id == revision_id, Revision.device_id == device_id)
    )
    if result.rowcount == 0:
        raise NotFoundError("Revision not found")
    return {"deleted": True}

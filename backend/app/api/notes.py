"""Notes CRUD."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId, RateLimitedDeviceId
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.note import Note
from app.schemas.tracking import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])
SessionDep = Depends(get_session)


@router.get("", response_model=list[NoteOut])
async def list_notes(
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
    problem_slug: str | None = None,
) -> list[NoteOut]:
    stmt = select(Note).where(Note.device_id == device_id).order_by(Note.updated_at.desc())
    if problem_slug:
        stmt = stmt.where(Note.problem_slug == problem_slug)
    return [NoteOut.model_validate(n) for n in (await session.execute(stmt)).scalars().all()]


@router.post("", response_model=NoteOut, status_code=201)
async def create_note(
    body: NoteCreate,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> NoteOut:
    note = Note(
        device_id=device_id,
        problem_slug=body.problem_slug or None,
        title=body.title,
        body=body.body,
        tags=body.tags,
    )
    session.add(note)
    await session.flush()
    return NoteOut.model_validate(note)


@router.put("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    body: NoteUpdate,
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
) -> NoteOut:
    note = (
        await session.execute(select(Note).where(Note.id == note_id, Note.device_id == device_id))
    ).scalar_one_or_none()
    if note is None:
        raise NotFoundError("Note not found")
    if body.title is not None:
        note.title = body.title
    if body.body is not None:
        note.body = body.body
    if body.tags is not None:
        note.tags = body.tags
    await session.flush()
    return NoteOut.model_validate(note)


@router.delete("/{note_id}")
async def delete_note(note_id: int, device_id: DeviceId, session: AsyncSession = SessionDep) -> dict:
    result = await session.execute(
        delete(Note).where(Note.id == note_id, Note.device_id == device_id)
    )
    if result.rowcount == 0:
        raise NotFoundError("Note not found")
    return {"deleted": True}

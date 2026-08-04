"""Flashcard CRUD and spaced-repetition review."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId, RateLimitedDeviceId
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.flashcard import Flashcard
from app.schemas.tracking import FlashcardCreate, FlashcardOut, FlashcardReview

router = APIRouter(prefix="/flashcards", tags=["flashcards"])
SessionDep = Depends(get_session)


@router.get("", response_model=list[FlashcardOut])
async def list_flashcards(
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
    due_only: bool = False,
) -> list[FlashcardOut]:
    stmt = select(Flashcard).where(Flashcard.device_id == device_id).order_by(Flashcard.next_review_at)
    if due_only:
        stmt = stmt.where(Flashcard.next_review_at <= datetime.now(UTC))
    return [FlashcardOut.model_validate(f) for f in (await session.execute(stmt)).scalars().all()]


@router.post("", response_model=FlashcardOut, status_code=201)
async def create_flashcard(
    body: FlashcardCreate,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> FlashcardOut:
    fc = Flashcard(
        device_id=device_id,
        problem_slug=body.problem_slug or None,
        question=body.question,
        answer=body.answer,
    )
    session.add(fc)
    await session.flush()
    return FlashcardOut.model_validate(fc)


@router.post("/{card_id}/review", response_model=FlashcardOut)
async def review_flashcard(
    card_id: int,
    body: FlashcardReview,
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
) -> FlashcardOut:
    fc = (
        await session.execute(select(Flashcard).where(Flashcard.id == card_id, Flashcard.device_id == device_id))
    ).scalar_one_or_none()
    if fc is None:
        raise NotFoundError("Flashcard not found")
    fc.schedule_next(body.recalled)
    await session.flush()
    return FlashcardOut.model_validate(fc)


@router.delete("/{card_id}")
async def delete_flashcard(card_id: int, device_id: DeviceId, session: AsyncSession = SessionDep) -> dict:
    result = await session.execute(
        delete(Flashcard).where(Flashcard.id == card_id, Flashcard.device_id == device_id)
    )
    if result.rowcount == 0:
        raise NotFoundError("Flashcard not found")
    return {"deleted": True}

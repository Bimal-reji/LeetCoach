"""Problem registry + attempt tracking."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DeviceId, RateLimitedDeviceId
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.attempt import Attempt
from app.models.problem import Problem
from app.schemas.tracking import AttemptOut, ProblemOut, ProblemUpsert
from app.services.stats import record_attempt

router = APIRouter(prefix="/problems", tags=["problems"])

SessionDep = Depends(get_session)


async def _upsert_problem(session: AsyncSession, upsert: ProblemUpsert) -> Problem:
    """Create or update the problem row from the extension's extraction."""
    slug = upsert.problem.slug or upsert.problem.title.lower().replace(" ", "-")
    problem = (
        await session.execute(select(Problem).where(Problem.slug == slug))
    ).scalar_one_or_none()
    if problem is None:
        problem = Problem(slug=slug, leetcode_id=upsert.problem.leetcode_id or 0)
        session.add(problem)
    problem.title = upsert.problem.title or problem.title
    problem.difficulty = upsert.problem.difficulty
    problem.tags = upsert.problem.tags
    problem.description = upsert.problem.description
    problem.examples = upsert.problem.examples
    problem.constraints = upsert.problem.constraints
    problem.function_signature = upsert.problem.function_signature
    problem.url = upsert.problem.url or problem.url
    await session.flush()
    return problem


@router.post("", status_code=201)
async def upsert_problem(
    body: ProblemUpsert,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> ProblemOut:
    """Register/extract a problem the user opened. Also records an attempt."""
    problem = await _upsert_problem(session, body)
    if body.status:
        await record_attempt_with(session, device_id, problem, body)
    return ProblemOut.model_validate(problem)


@router.post("/{slug}/attempts", status_code=201)
async def create_attempt(
    slug: str,
    body: ProblemUpsert,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> AttemptOut:
    """Record a submission outcome (accepted/wrong/attempted) for a problem."""
    problem = (
        await session.execute(select(Problem).where(Problem.slug == slug))
    ).scalar_one_or_none()
    if problem is None:
        problem = await _upsert_problem(session, body)
    attempt = await record_attempt_with(session, device_id, problem, body, explicit_slug=slug)
    return AttemptOut.model_validate(attempt)


async def record_attempt_with(
    session: AsyncSession,
    device_id: str,
    problem: Problem,
    body: ProblemUpsert,
    explicit_slug: str | None = None,
) -> Attempt:
    previously_solved = (
        await session.execute(
            select(Attempt).where(
                Attempt.device_id == device_id,
                Attempt.problem_slug == problem.slug,
                Attempt.status.in_(("accepted", "solved")),
            )
        )
    ).scalar_one_or_none()
    first_solve = body.status in ("accepted", "solved") and previously_solved is None

    attempt = Attempt(
        device_id=device_id,
        problem_slug=problem.slug,
        status=body.status,
        language=body.problem.language or "python",
        code=body.problem.code,
        time_ms=body.time_ms,
        first_try=body.first_try,
        tags=body.problem.tags,
    )
    session.add(attempt)
    await record_attempt(session, device_id, attempt, problem, first_solve=first_solve)
    await session.flush()
    return attempt


@router.get("", response_model=list[ProblemOut])
async def list_problems(
    device_id: DeviceId,
    session: AsyncSession = SessionDep,
    difficulty: str | None = None,
    tag: str | None = None,
) -> list[ProblemOut]:
    """List problems in the registry (optionally filtered)."""
    stmt = select(Problem).order_by(Problem.leetcode_id)
    if difficulty:
        stmt = stmt.where(Problem.difficulty == difficulty)
    rows = (await session.execute(stmt)).scalars().all()
    # JSON .contains() is not portable to SQLite, so filter tags in Python.
    if tag:
        tag_lower = tag.lower()
        rows = [p for p in rows if any(t.lower() == tag_lower for t in p.tags)]
    return [ProblemOut.model_validate(p) for p in rows]


@router.get("/{slug}", response_model=ProblemOut)
async def get_problem(slug: str, session: AsyncSession = SessionDep) -> ProblemOut:
    problem = (
        await session.execute(select(Problem).where(Problem.slug == slug))
    ).scalar_one_or_none()
    if problem is None:
        raise NotFoundError(f"Problem '{slug}' not found in the registry.")
    return ProblemOut.model_validate(problem)

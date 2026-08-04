"""AI mentor endpoints (hints, patterns, complexity, debug, review, ...)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RateLimitedDeviceId
from app.db.session import get_session
from app.schemas.ai import (
    ComplexityResponse,
    DailyChallenge,
    DebugRequest,
    DebugResponse,
    ExplainRequest,
    ExplainResponse,
    HintsRequest,
    HintsResponse,
    InterviewAnswerRequest,
    InterviewFeedback,
    InterviewResponse,
    PatternResponse,
    ReviewResponse,
    SimilarResponse,
    SolutionResponse,
)
from app.schemas.common import ProblemContext
from app.schemas.tracking import FlashcardGenerateRequest
from app.services import similar as similar_service
from app.services.coach import coach
from app.services.daily import get_daily_challenge
from app.services.rag import retriever

router = APIRouter(prefix="/ai", tags=["ai"])
SessionDep = Depends(get_session)


@router.post("/hints", response_model=HintsResponse)
async def hints(body: HintsRequest, _: RateLimitedDeviceId) -> HintsResponse:
    """Progressive hint ladder (never reveals the solution)."""
    return await coach.hints(body.problem, body.levels_to_reveal)


@router.post("/pattern", response_model=PatternResponse)
async def pattern(body: ProblemContext, _: RateLimitedDeviceId) -> PatternResponse:
    """Detect the algorithmic pattern and explain why."""
    return await coach.pattern(body)


@router.post("/complexity", response_model=ComplexityResponse)
async def complexity(body: ProblemContext, _: RateLimitedDeviceId) -> ComplexityResponse:
    """Estimate time/space complexity of the user's code."""
    return await coach.complexity(body)


@router.post("/debug", response_model=DebugResponse)
async def debug(body: DebugRequest, _: RateLimitedDeviceId) -> DebugResponse:
    """Debug assistant: mistakes, edge cases, missing conditions, tests."""
    return await coach.debug(body.problem, error=body.error)


@router.post("/review", response_model=ReviewResponse)
async def review(body: ProblemContext, _: RateLimitedDeviceId) -> ReviewResponse:
    """Code review: naming, readability, optimization, duplication, dead code."""
    return await coach.review(body)


@router.post("/explain", response_model=ExplainResponse)
async def explain(body: ExplainRequest, _: RateLimitedDeviceId) -> ExplainResponse:
    """Line-by-line explanation in beginner/intermediate/interview modes."""
    return await coach.explain(body.problem, mode=body.mode)


@router.post("/interview", response_model=InterviewResponse)
async def interview(body: ProblemContext, _: RateLimitedDeviceId) -> InterviewResponse:
    """Generate interview follow-up questions."""
    return await coach.interview(body)


@router.post("/interview/feedback", response_model=InterviewFeedback)
async def interview_feedback(
    body: InterviewAnswerRequest, _: RateLimitedDeviceId
) -> InterviewFeedback:
    """Score the user's answer to an interview question."""
    return await coach.interview_feedback(body.problem, body.question_id, body.answer)


@router.post("/solution", response_model=SolutionResponse)
async def solution(body: ProblemContext, _: RateLimitedDeviceId) -> SolutionResponse:
    """Explicitly requested solution — the only endpoint that reveals code."""
    return await coach.solution(body)


@router.post("/similar", response_model=SimilarResponse)
async def similar(body: ProblemContext, _: RateLimitedDeviceId) -> SimilarResponse:
    """Recommend related problems grouped by difficulty."""
    return similar_service.recommend(body)


@router.get("/daily", response_model=DailyChallenge)
async def daily(
    device_id: RateLimitedDeviceId, session: AsyncSession = SessionDep
) -> DailyChallenge:
    """Personalized daily challenge."""
    return await get_daily_challenge(session, device_id)


@router.post("/flashcards/generate")
async def generate_flashcards(
    body: FlashcardGenerateRequest,
    device_id: RateLimitedDeviceId,
    session: AsyncSession = SessionDep,
) -> list[dict]:
    """Generate flashcards from a solved problem (and store them)."""
    problem = body.problem_slug or "unknown"
    context = ProblemContext(slug=problem, title=problem.replace("-", " ").title(), tags=[], code="")
    cards = await coach.generate_flashcards(context, body.count)

    from sqlalchemy import select

    from app.models.flashcard import Flashcard
    from app.models.problem import Problem as ProblemModel

    db_problem = None
    if body.problem_slug:
        db_problem = (
            await session.execute(select(ProblemModel).where(ProblemModel.slug == body.problem_slug))
        ).scalar_one_or_none()

    stored = []
    for card in cards:
        fc = Flashcard(
            device_id=device_id,
            problem_slug=db_problem.slug if db_problem else None,
            question=card["question"],
            answer=card["answer"],
        )
        session.add(fc)
        stored.append(card)
    await session.flush()
    return stored


@router.get("/rag")
async def rag_search(q: str, _: RateLimitedDeviceId, k: int = 5) -> dict:
    """Retrieve DSA knowledge-base chunks (powers grounded chat)."""
    hits = retriever.retrieve(q, k=k)
    return {"results": hits}

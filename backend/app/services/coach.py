"""Coach service — the single entry point for all AI features.

Wraps the active provider (Groq when a key is set, otherwise the mock) and
exposes clean, typed methods used by the API layer. The provider is chosen at
startup from settings; switching providers never changes route code.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.config import settings
from app.logging_conf import get_logger
from app.schemas.ai import (
    ComplexityResponse,
    DebugResponse,
    ExplainResponse,
    HintsResponse,
    InterviewFeedback,
    InterviewResponse,
    PatternResponse,
    ReviewResponse,
    SolutionResponse,
)
from app.schemas.chat import ChatRequest
from app.schemas.common import ProblemContext

logger = get_logger(__name__)


class CoachService:
    """Facade around the active AI provider (Groq or mock)."""

    def __init__(self) -> None:
        self._provider = None
        self._provider_name: str | None = None

    async def start(self) -> None:
        """Instantiate the provider matching the current settings."""
        if settings.ai_provider == "groq":
            from app.services.groq import GroqProvider

            self._provider = GroqProvider()
            self._provider_name = "groq"
        else:
            from app.services.mock import MockProvider

            self._provider = MockProvider()
            self._provider_name = "mock"
        logger.info("AI provider active: %s", self._provider_name)

    async def close(self) -> None:
        close = getattr(self._provider, "close", None)
        if close:
            await close()

    @property
    def provider_name(self) -> str:
        return self._provider_name or settings.ai_provider

    # ------------------------------------------------------------------
    async def hints(self, problem: ProblemContext, levels_to_reveal: int) -> HintsResponse:
        return await self._provider.hints(problem, levels_to_reveal)

    async def pattern(self, problem: ProblemContext) -> PatternResponse:
        return await self._provider.pattern(problem)

    async def complexity(self, problem: ProblemContext) -> ComplexityResponse:
        return await self._provider.complexity(problem)

    async def debug(self, problem: ProblemContext, error: str) -> DebugResponse:
        return await self._provider.debug(problem, error)

    async def review(self, problem: ProblemContext) -> ReviewResponse:
        return await self._provider.review(problem)

    async def explain(self, problem: ProblemContext, mode: str) -> ExplainResponse:
        return await self._provider.explain(problem, mode)

    async def interview(self, problem: ProblemContext) -> InterviewResponse:
        return await self._provider.interview(problem)

    async def interview_feedback(
        self, problem: ProblemContext, question_id: str, answer: str
    ) -> InterviewFeedback:
        return await self._provider.interview_feedback(problem, question_id, answer)

    async def solution(self, problem: ProblemContext) -> SolutionResponse:
        return await self._provider.solution(problem)

    async def chat(self, request: ChatRequest) -> AsyncIterator[str]:
        async for delta in self._provider.chat(request):
            yield delta

    async def generate_flashcards(self, problem: ProblemContext, count: int) -> list[dict]:
        return await self._provider.generate_flashcards(problem, count)


coach = CoachService()

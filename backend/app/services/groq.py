"""Groq LLM provider.

Uses the OpenAI-compatible chat completions API (``llama-3.3-70b-versatile``
by default) with strict-JSON responses. Every method mirrors
:class:`MockProvider` and **falls back to the mock implementation** if the
upstream call fails, so the API never breaks when Groq is down or the key is
invalid.
"""

from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator
from typing import Any

import httpx

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
from app.services import prompts
from app.services.mock import MockProvider

logger = get_logger(__name__)


def _strip_fences(text: str) -> str:
    """Remove ```json ... ``` fences if the model wrapped its JSON."""
    text = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.S)
    return m.group(1) if m else text


class GroqProvider:
    """LLM-backed implementation of the AI interface."""

    name = "groq"

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.groq_base_url,
            timeout=settings.groq_timeout_seconds,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
        )
        self._mock = MockProvider()

    async def close(self) -> None:
        await self._client.aclose()

    # ------------------------------------------------------------- low level
    async def _chat_json(self, messages: list[dict], max_tokens: int | None = None) -> dict:
        payload: dict[str, Any] = {
            "model": settings.groq_model,
            "messages": messages,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        resp = await self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(_strip_fences(content))

    async def _stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload: dict[str, Any] = {
            "model": settings.groq_model,
            "messages": messages,
            "temperature": 0.5,
            "stream": True,
            "max_tokens": settings.groq_max_tokens,
        }
        async with self._client.stream("POST", "/chat/completions", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[len("data:") :].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0]["delta"].get("content")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    # ------------------------------------------------------------- features
    async def hints(self, problem: ProblemContext, levels_to_reveal: int) -> HintsResponse:
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.INTROVERTED_HINTS.format(n=levels_to_reveal),
                problem,
            )
            data = await self._chat_json(messages)
            from app.schemas.ai import HintLevel

            levels = []
            for item in data.get("levels", [])[:levels_to_reveal]:
                levels.append(
                    HintLevel(
                        level=int(item.get("level", len(levels) + 1)),
                        title=str(item.get("title", f"Hint {len(levels) + 1}")),
                        hint=str(item.get("hint", "")),
                    )
                )
            return HintsResponse(
                pattern=data.get("pattern", ""),
                levels=levels,
                code_revealed=False,
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001 - degrade gracefully
            logger.warning("Groq hints failed (%s); using mock", exc)
            return await self._mock.hints(problem, levels_to_reveal)

    async def pattern(self, problem: ProblemContext) -> PatternResponse:
        # Ground truth from the deterministic detector; LLM only refines prose.
        base = await self._mock.pattern(problem)
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.PATTERN_TASK,
                problem,
            )
            data = await self._chat_json(messages)
            prim = data.get("primary", {})
            if prim.get("key"):
                from app.schemas.ai import PatternMatch

                base.primary = PatternMatch(
                    key=str(prim["key"]),
                    name=str(prim.get("name", prim["key"].replace("_", " ").title())),
                    confidence=float(prim.get("confidence", 0.8)),
                    reason=str(prim.get("reason", base.primary.reason)),
                )
                base.alternatives = [
                    PatternMatch(
                        key=str(a["key"]),
                        name=str(a.get("name", a["key"].replace("_", " ").title())),
                        confidence=float(a.get("confidence", 0.5)),
                        reason=str(a.get("reason", "")),
                    )
                    for a in data.get("alternatives", [])[:3]
                    if a.get("key")
                ]
                base.explanation = str(data.get("explanation", base.explanation))
                base.when_to_use = str(data.get("when_to_use", base.when_to_use))
            base.source = self.name
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq pattern enrichment failed (%s); using rule-based", exc)
        return base

    async def complexity(self, problem: ProblemContext) -> ComplexityResponse:
        base = await self._mock.complexity(problem)
        if not problem.code.strip():
            return base
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.COMPLEXITY_TASK,
                problem,
            )
            data = await self._chat_json(messages)
            return ComplexityResponse(
                time_complexity=str(data.get("time_complexity", base.time_complexity)),
                space_complexity=str(data.get("space_complexity", base.space_complexity)),
                explanation=str(data.get("explanation", base.explanation)),
                optimizations=[str(o) for o in data.get("optimizations", base.optimizations)],
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq complexity failed (%s); using heuristic", exc)
            return base

    async def debug(self, problem: ProblemContext, error: str) -> DebugResponse:
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.DEBUG_TASK + f"\nCompiler/judge error: {error}",
                problem,
            )
            data = await self._chat_json(messages)
            return DebugResponse(
                possible_mistakes=[str(x) for x in data.get("possible_mistakes", [])],
                edge_cases=[str(x) for x in data.get("edge_cases", [])],
                missing_conditions=[str(x) for x in data.get("missing_conditions", [])],
                suggested_tests=[str(x) for x in data.get("suggested_tests", [])],
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq debug failed (%s); using mock", exc)
            return await self._mock.debug(problem, error)

    async def review(self, problem: ProblemContext) -> ReviewResponse:
        try:
            messages = prompts.build_messages(prompts.SYSTEM_PHILOSOPHY, prompts.REVIEW_TASK, problem)
            data = await self._chat_json(messages)
            from app.schemas.ai import ReviewFinding

            findings = []
            for f in data.get("findings", []):
                findings.append(
                    ReviewFinding(
                        category=str(f.get("category", "readability")),
                        severity=str(f.get("severity", "info")),
                        message=str(f.get("message", "")),
                        suggestion=str(f.get("suggestion", "")),
                    )
                )
            return ReviewResponse(
                rating=int(data.get("rating", 7)),
                summary=str(data.get("summary", "")),
                findings=findings,
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq review failed (%s); using mock", exc)
            return await self._mock.review(problem)

    async def explain(self, problem: ProblemContext, mode: str) -> ExplainResponse:
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.EXPLAIN_TASK.format(mode=mode),
                problem,
            )
            data = await self._chat_json(messages)
            from app.schemas.ai import LineExplanation

            lines = [
                LineExplanation(
                    line=int(item.get("line", i + 1)),
                    code=str(item.get("code", "")),
                    explanation=str(item.get("explanation", "")),
                )
                for i, item in enumerate(data.get("lines", []))
            ]
            return ExplainResponse(
                mode=mode,
                overview=str(data.get("overview", "")),
                lines=lines,
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq explain failed (%s); using mock", exc)
            return await self._mock.explain(problem, mode)

    async def interview(self, problem: ProblemContext) -> InterviewResponse:
        try:
            messages = prompts.build_messages(prompts.SYSTEM_PHILOSOPHY, prompts.INTERVIEW_TASK, problem)
            data = await self._chat_json(messages)
            from app.schemas.ai import InterviewQuestion

            questions = [
                InterviewQuestion(
                    id=str(q.get("id", f"q{i + 1}")),
                    question=str(q.get("question", "")),
                    expected_points=[str(p) for p in q.get("expected_points", [])],
                )
                for i, q in enumerate(data.get("questions", [])[:4])
            ]
            return InterviewResponse(questions=questions, source=self.name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq interview failed (%s); using mock", exc)
            return await self._mock.interview(problem)

    async def interview_feedback(
        self, problem: ProblemContext, question_id: str, answer: str
    ) -> InterviewFeedback:
        try:
            task = prompts.INTERVIEW_FEEDBACK_TASK + f"\nQuestion: {question_id}\nUser answer: {answer}"
            messages = prompts.build_messages(prompts.SYSTEM_PHILOSOPHY, task, problem)
            data = await self._chat_json(messages)
            return InterviewFeedback(
                score=int(data.get("score", 5)),
                feedback=str(data.get("feedback", "")),
                what_to_improve=[str(x) for x in data.get("what_to_improve", [])],
                sample_answer=str(data.get("sample_answer", "")),
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq interview feedback failed (%s); using mock", exc)
            return await self._mock.interview_feedback(problem, question_id, answer)

    async def solution(self, problem: ProblemContext) -> SolutionResponse:
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.SOLUTION_TASK.format(language=problem.language),
                problem,
            )
            data = await self._chat_json(messages, max_tokens=4096)
            return SolutionResponse(
                solution=str(data.get("solution", "")),
                explanation=str(data.get("explanation", "")),
                language=problem.language,
                source=self.name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq solution failed (%s); using mock", exc)
            return await self._mock.solution(problem)

    async def chat(self, request: ChatRequest) -> AsyncIterator[str]:
        try:
            messages = [{"role": "system", "content": prompts.CHAT_SYSTEM}]
            if request.problem and request.problem.has_problem:
                messages.append(
                    {
                        "role": "user",
                        "content": f"Context (current LeetCode problem):\n{prompts.problem_block(request.problem)}",
                    }
                )
            for m in request.history[-20:]:
                messages.append({"role": m.role, "content": m.content})
            messages.append({"role": "user", "content": request.message})
            async for delta in self._stream(messages):
                yield delta
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq chat failed (%s); using mock", exc)
            async for delta in self._mock.chat(request):
                yield delta

    async def generate_flashcards(self, problem: ProblemContext, count: int) -> list[dict]:
        try:
            messages = prompts.build_messages(
                prompts.SYSTEM_PHILOSOPHY,
                prompts.FLASHCARD_TASK.format(count=count),
                problem,
            )
            data = await self._chat_json(messages)
            cards = data.get("cards", [])[:count]
            if cards:
                return [{"question": str(c["question"]), "answer": str(c["answer"])} for c in cards]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq flashcards failed (%s); using mock", exc)
        return await self._mock.generate_flashcards(problem, count)

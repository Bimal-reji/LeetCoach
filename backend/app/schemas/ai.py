"""Schemas for every AI feature (hints, patterns, complexity, ...)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ProblemContext

Mode = Literal["beginner", "intermediate", "interview"]


# ---------------------------------------------------------------- Hints
class HintLevel(BaseModel):
    level: int
    title: str
    hint: str


class HintsRequest(BaseModel):
    problem: ProblemContext
    levels_to_reveal: int = Field(default=1, ge=1, le=3)


class DebugRequest(BaseModel):
    problem: ProblemContext
    error: str = Field(default="", max_length=8000)


class ExplainRequest(BaseModel):
    problem: ProblemContext
    mode: Mode = "intermediate"


class HintsResponse(BaseModel):
    pattern: str = ""
    levels: list[HintLevel] = Field(default_factory=list)
    code_revealed: bool = False
    source: str = "mock"


# ---------------------------------------------------------------- Pattern
class PatternMatch(BaseModel):
    key: str
    name: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str


class PatternResponse(BaseModel):
    primary: PatternMatch
    alternatives: list[PatternMatch] = Field(default_factory=list)
    explanation: str = ""
    when_to_use: str = ""
    source: str = "mock"


# ---------------------------------------------------------------- Complexity
class ComplexityResponse(BaseModel):
    time_complexity: str
    space_complexity: str
    explanation: str
    optimizations: list[str] = Field(default_factory=list)
    source: str = "mock"


# ---------------------------------------------------------------- Debug
class DebugResponse(BaseModel):
    possible_mistakes: list[str] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    missing_conditions: list[str] = Field(default_factory=list)
    suggested_tests: list[str] = Field(default_factory=list)
    source: str = "mock"


# ---------------------------------------------------------------- Review
class ReviewFinding(BaseModel):
    category: Literal["naming", "readability", "optimization", "duplication", "dead_code", "memory", "correctness"]
    severity: Literal["info", "warning", "critical"]
    message: str
    suggestion: str = ""


class ReviewResponse(BaseModel):
    rating: int = Field(ge=1, le=10)
    summary: str
    findings: list[ReviewFinding] = Field(default_factory=list)
    source: str = "mock"


# ---------------------------------------------------------------- Explain
class LineExplanation(BaseModel):
    line: int
    code: str
    explanation: str


class ExplainResponse(BaseModel):
    mode: Mode
    overview: str
    lines: list[LineExplanation] = Field(default_factory=list)
    source: str = "mock"


# ---------------------------------------------------------------- Interview
class InterviewQuestion(BaseModel):
    id: str
    question: str
    expected_points: list[str] = Field(default_factory=list)


class InterviewResponse(BaseModel):
    questions: list[InterviewQuestion] = Field(default_factory=list)
    source: str = "mock"


class InterviewAnswerRequest(BaseModel):
    problem: ProblemContext
    question_id: str
    answer: str


class InterviewFeedback(BaseModel):
    score: int = Field(ge=0, le=10)
    feedback: str
    what_to_improve: list[str] = Field(default_factory=list)
    sample_answer: str = ""
    source: str = "mock"


# ---------------------------------------------------------------- Solution
class SolutionResponse(BaseModel):
    solution: str
    explanation: str = ""
    language: str = "python"
    source: str = "mock"


# ---------------------------------------------------------------- Similar
class SimilarProblem(BaseModel):
    slug: str
    leetcode_id: int
    title: str
    difficulty: str
    tags: list[str]
    pattern: str
    url: str


class SimilarResponse(BaseModel):
    easy: list[SimilarProblem] = Field(default_factory=list)
    medium: list[SimilarProblem] = Field(default_factory=list)
    hard: list[SimilarProblem] = Field(default_factory=list)
    source: str = "mock"


# ---------------------------------------------------------------- Daily
class DailyChallenge(BaseModel):
    date: str
    problem: dict[str, Any]
    focus_topics: list[str] = Field(default_factory=list)
    plan: list[str] = Field(default_factory=list)
    source: str = "mock"

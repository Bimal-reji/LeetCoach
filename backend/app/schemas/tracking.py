"""Schemas for tracking features: progress, notes, flashcards, revisions, leaderboard."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ProblemContext


# ---------------------------------------------------------------- Problems / attempts
class ProblemUpsert(BaseModel):
    problem: ProblemContext
    status: str = Field(..., pattern="^(accepted|wrong|attempted|solved)$")
    first_try: bool = False
    time_ms: int | None = Field(default=None, ge=0, le=24 * 60 * 60 * 1000)


class ProblemOut(BaseModel):
    slug: str
    leetcode_id: int | None
    title: str
    difficulty: str
    tags: list[str]
    pattern_key: str | None
    description: str
    url: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AttemptOut(BaseModel):
    id: int
    status: str
    language: str
    time_ms: int | None
    first_try: bool
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- Progress
class TopicStat(BaseModel):
    topic: str
    attempted: int = 0
    solved: int = 0
    first_try_rate: float = 0.0
    avg_time_ms: int | None = None
    strength: float = Field(default=0.0, ge=0.0, le=1.0)  # 0 weak -> 1 strong


class HeatmapDay(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class ProgressResponse(BaseModel):
    solved_count: int
    attempted_count: int
    streak: int
    longest_streak: int
    points: int
    total_time_ms: int
    topics: list[TopicStat] = Field(default_factory=list)
    weak_topics: list[str] = Field(default_factory=list)
    strong_topics: list[str] = Field(default_factory=list)
    heatmap: list[HeatmapDay] = Field(default_factory=list)
    difficulty_counts: dict[str, int] = Field(default_factory=dict)


# ---------------------------------------------------------------- Leaderboard
class LeaderboardEntry(BaseModel):
    device_id: str
    display_name: str
    points: int
    solved_count: int
    streak: int


# ---------------------------------------------------------------- Notes
class NoteCreate(BaseModel):
    problem_slug: str | None = None
    title: str = ""
    body: str = Field(min_length=1, max_length=20000)
    tags: list[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    tags: list[str] | None = None


class NoteOut(BaseModel):
    id: int
    problem_slug: str | None
    title: str
    body: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- Flashcards
class FlashcardCreate(BaseModel):
    problem_slug: str | None = None
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=8000)


class FlashcardOut(BaseModel):
    id: int
    problem_slug: str | None
    question: str
    answer: str
    box: int
    review_count: int
    next_review_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashcardReview(BaseModel):
    recalled: bool


class FlashcardGenerateRequest(BaseModel):
    problem_slug: str | None = None
    count: int = Field(default=4, ge=1, le=12)


# ---------------------------------------------------------------- Revisions
class RevisionCreate(BaseModel):
    problem_slug: str | None = None
    kind: str = Field(..., pattern="^(observation|pattern|mistake|tip)$")
    content: str = Field(min_length=1, max_length=20000)


class RevisionOut(BaseModel):
    id: int
    problem_slug: str | None
    kind: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- Daily
class DailyLogOut(BaseModel):
    date: str
    problem_slug: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- Health
class HealthOut(BaseModel):
    status: str
    version: str
    ai_provider: str
    database: str
    cache: str

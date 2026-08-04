"""Schemas for the conversational AI chat (streamed)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ProblemContext

ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    problem: ProblemContext | None = None
    history: list[ChatMessage] = Field(default_factory=list, max_length=50)


class ChatChunk(BaseModel):
    """One SSE payload emitted while streaming a reply."""

    delta: str = ""
    done: bool = False
    error: str | None = None

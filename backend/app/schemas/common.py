"""Shared request/response schemas used across the API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DeviceIdHeader(BaseModel):
    """Device identity passed via ``X-Device-Id``.

    v1 is auth-free: a random UUID generated once by the extension and stored
    in ``chrome.storage.local``. The schema is intentionally future-proof —
    swapping this for a Firebase JWT later only changes the dependency, not
    the models.
    """

    device_id: str = Field(min_length=8, max_length=128)


class ErrorOut(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ProblemContext(BaseModel):
    """Normalised problem payload extracted by the extension's content script."""

    slug: str = ""
    leetcode_id: int | None = None
    title: str = ""
    difficulty: str = "Medium"
    tags: list[str] = Field(default_factory=list)
    description: str = ""
    examples: list[dict[str, Any]] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    function_signature: dict[str, Any] | None = None
    url: str = ""
    code: str = ""
    language: str = "python"

    @property
    def has_problem(self) -> bool:
        return bool(self.slug or self.title)

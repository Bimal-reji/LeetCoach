"""Shared FastAPI dependencies."""

from __future__ import annotations

import asyncio
import time
from typing import Annotated

from fastapi import Depends, Header

from app.config import settings
from app.core.errors import BadRequestError, RateLimitedError

_limiter: dict[str, list[float]] = {}
_limiter_lock = asyncio.Lock()


async def get_device_id(
    x_device_id: Annotated[str | None, Header(alias="X-Device-Id")] = None,
) -> str:
    """Resolve the caller's identity.

    v1 uses an extension-generated device UUID. When Firebase Auth lands,
    this dependency is replaced by JWT verification while route code stays
    unchanged.
    """
    device_id = (x_device_id or settings.default_device_id or "").strip()
    if len(device_id) < 8 or len(device_id) > 128:
        raise BadRequestError("A valid X-Device-Id header (8-128 chars) is required.")
    return device_id


async def check_rate_limit(device_id: Annotated[str, Depends(get_device_id)]) -> str:
    """Per-device sliding-window rate limiter (in-process, async-safe)."""
    limit = settings.rate_limit_per_minute
    now = time.monotonic()
    async with _limiter_lock:
        window = _limiter.setdefault(device_id, [])
        window[:] = [t for t in window if now - t < 60]
        if len(window) >= limit:
            raise RateLimitedError(f"Rate limit of {limit} requests/minute exceeded.")
        window.append(now)
    return device_id


DeviceId = Annotated[str, Depends(get_device_id)]
RateLimitedDeviceId = Annotated[str, Depends(check_rate_limit)]

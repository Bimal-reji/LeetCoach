"""Cache abstraction.

Uses Redis when ``REDIS_URL`` is configured, otherwise transparently falls
back to a thread-safe in-memory TTL cache so local development requires no
infrastructure.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

from app.config import settings
from app.logging_conf import get_logger

logger = get_logger(__name__)

try:  # redis is optional at runtime
    import redis.asyncio as redis_aioredis  # type: ignore

    _REDIS_AVAILABLE = True
except Exception:  # pragma: no cover - import guard
    redis_aioredis = None  # type: ignore
    _REDIS_AVAILABLE = False


class _MemoryCache:
    """Minimal thread/async-safe TTL cache."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        item = self._store.get(key)
        if item is None:
            return None
        expires, value = item
        if expires < time.monotonic():
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl if ttl is not None else settings.cache_ttl_seconds
        async with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)


class Cache:
    """Unified async cache facade."""

    def __init__(self) -> None:
        self._memory = _MemoryCache()
        self._redis: Any = None

    async def start(self) -> None:
        if _REDIS_AVAILABLE and settings.redis_url:
            try:
                self._redis = redis_aioredis.from_url(settings.redis_url, decode_responses=True)
                await self._redis.ping()
                logger.info("Cache: redis connected")
            except Exception as exc:  # pragma: no cover
                logger.warning("Cache: redis unavailable (%s); using memory cache", exc)
                self._redis = None

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def get(self, key: str) -> Any | None:
        if self._redis is not None:
            return await self._redis.get(key)
        return await self._memory.get(key)

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl if ttl is not None else settings.cache_ttl_seconds
        if self._redis is not None:
            await self._redis.set(key, value, ex=ttl)
        else:
            await self._memory.set(key, value, ttl)

    async def delete(self, key: str) -> None:
        if self._redis is not None:
            await self._redis.delete(key)
        else:
            await self._memory.delete(key)

    def key(self, *parts: str) -> str:
        return ":".join(parts)


cache = Cache()

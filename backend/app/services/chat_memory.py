"""Conversation memory.

Stores recent turns per device in the cache layer (Redis if configured,
in-memory otherwise) so chat context survives between requests but stays
bounded. JSON-serialized, TTL'd, namespaced per device.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.cache import cache
from app.logging_conf import get_logger
from app.schemas.chat import ChatMessage

logger = get_logger(__name__)

MAX_TURNS = 40
TTL = 60 * 60 * 6  # 6 hours


def _key(device_id: str) -> str:
    return cache.key("chat", "memory", device_id)


async def load_history(device_id: str) -> list[dict]:
    """Return the stored conversation (list of {role, content})."""
    raw = await cache.get(_key(device_id))
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [m for m in data if isinstance(m, dict) and m.get("role") in ("user", "assistant", "system")]
    except json.JSONDecodeError:
        logger.warning("Corrupt chat memory for %s; resetting", device_id)
    return []


async def append_turns(device_id: str, turns: list[ChatMessage | dict]) -> None:
    """Append assistant/user turns and persist the trimmed history."""
    history = await load_history(device_id)
    for turn in turns:
        if isinstance(turn, ChatMessage):
            history.append({"role": turn.role, "content": turn.content})
        else:
            history.append({"role": str(turn["role"]), "content": str(turn["content"])})
    history = history[-MAX_TURNS:]
    await cache.set(_key(device_id), json.dumps(history), ttl=TTL)


async def clear_history(device_id: str) -> None:
    await cache.delete(_key(device_id))


def memory_safe(history: list[Any]) -> list[ChatMessage]:
    """Sanitize client-supplied history into validated ChatMessage objects."""
    out: list[ChatMessage] = []
    for m in history[-MAX_TURNS:]:
        try:
            out.append(ChatMessage(role=m["role"], content=m["content"]))
        except (KeyError, TypeError, ValueError):
            continue
    return out

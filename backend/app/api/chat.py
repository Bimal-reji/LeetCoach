"""Conversational AI chat with server-sent-event streaming."""

from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.deps import RateLimitedDeviceId
from app.schemas.chat import ChatMessage, ChatRequest
from app.services import chat_memory
from app.services.coach import coach

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def chat(body: ChatRequest, device_id: RateLimitedDeviceId) -> StreamingResponse:
    """Stream the mentor's reply as newline-delimited JSON (SSE)."""

    async def event_stream():
        # Build a sanitized history (role/content filtering) and send it to the provider.
        history = chat_memory.memory_safe(body.history)
        request = body.model_copy(update={"history": history})
        reply_parts: list[str] = []

        try:
            async for delta in coach.chat(request):
                chunk = json.dumps({"delta": delta, "done": False})
                yield f"data: {chunk}\n\n"
                reply_parts.append(delta)
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'delta': '', 'done': True, 'error': str(exc)})}\n\n"
            return

        full_reply = "".join(reply_parts)
        if full_reply.strip():
            await chat_memory.append_turns(
                device_id,
                [
                    ChatMessage(role="user", content=body.message),
                    ChatMessage(role="assistant", content=full_reply),
                ],
            )
        yield f"data: {json.dumps({'delta': '', 'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history")
async def history(device_id: RateLimitedDeviceId) -> dict:
    """Return the stored conversation memory for this device."""
    return {"history": await chat_memory.load_history(device_id)}


@router.delete("/history")
async def clear(device_id: RateLimitedDeviceId) -> dict:
    await chat_memory.clear_history(device_id)
    return {"cleared": True}

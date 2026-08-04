"""Aggregates all v1 routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import ai, chat, flashcards, health, leaderboard, notes, problems, progress, revisions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(problems.router)
api_router.include_router(ai.router)
api_router.include_router(chat.router)
api_router.include_router(progress.router)
api_router.include_router(notes.router)
api_router.include_router(flashcards.router)
api_router.include_router(revisions.router)
api_router.include_router(leaderboard.router)

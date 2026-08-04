"""Application configuration loaded from environment variables.

Uses pydantic-settings so every value can be overridden via ``.env`` or the
process environment. The application is deliberately runnable with **zero**
configuration: if no ``GROQ_API_KEY`` is present the ``mock`` AI provider is
used so every feature still works offline.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object. Access via :func:`get_settings`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    app_name: str = "LeetCoach AI"
    app_version: str = "1.0.0"
    environment: str = "development"
    log_level: str = "INFO"

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Comma-separated in .env, parsed into a list.
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ---- Database / cache ----
    database_url: str = "sqlite+aiosqlite:///./data/leetcoach.db"
    redis_url: str = ""  # empty => in-memory cache fallback
    cache_ttl_seconds: int = 300

    # ---- Groq (optional) ----
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_timeout_seconds: int = 60
    groq_max_tokens: int = 2048

    # ---- RAG (optional) ----
    rag_enabled: bool = True
    faiss_index_path: str = "./data/faiss_index"
    knowledge_base_path: str = "./data/knowledge_base.json"

    # ---- Limits / analytics ----
    rate_limit_per_minute: int = 60
    track_analytics: bool = True

    # ---- Device identity (auth-free v1) ----
    default_device_id: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: Any) -> Any:
        """Accept both JSON arrays and comma-separated strings in .env."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def ai_provider(self) -> str:
        """Name of the active AI provider: ``groq`` or ``mock``."""
        return "groq" if self.groq_api_key else "mock"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()


settings = get_settings()

"""Structured logging configuration for the application."""

from __future__ import annotations

import logging
import sys

from app.config import settings

LOGGING_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(level: str | None = None) -> None:
    """Configure the root logger once at process start."""
    root = logging.getLogger()
    root.setLevel((level or settings.log_level).upper())

    if not any(isinstance(h, logging.StreamHandler) for h in root.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(LOGGING_FORMAT, datefmt=DATE_FORMAT))
        root.addHandler(handler)

    # Keep third-party loggers reasonably quiet.
    for noisy in ("uvicorn.access", "httpcore", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a module-scoped logger."""
    return logging.getLogger(name)

"""Create tables and seed the knowledge base.

Runnable directly:  ``python -m app.db.init_db``
Also invoked from the app lifespan on first boot.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.config import settings
from app.data.problems import PROBLEMS
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.logging_conf import configure_logging, get_logger
from app.models import Problem  # noqa: F401  (registers tables)
from app.models.attempt import Attempt  # noqa: F401
from app.models.flashcard import Flashcard  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.revision import Revision  # noqa: F401
from app.models.user_stats import UserStats  # noqa: F401

logger = get_logger(__name__)


async def _ensure_data_dir() -> None:
    Path(settings.faiss_index_path).parent.mkdir(parents=True, exist_ok=True)
    data_dir = Path(settings.database_url.split("///")[-1]).parent if "sqlite" in settings.database_url else Path("./data")
    data_dir.mkdir(parents=True, exist_ok=True)


async def _write_knowledge_base_json() -> None:
    """Materialize the knowledge base as JSON for the RAG fallback reader."""
    kb_path = Path(settings.knowledge_base_path)
    kb_path.parent.mkdir(parents=True, exist_ok=True)
    if not kb_path.exists():
        kb_path.write_text(json.dumps(PROBLEMS, indent=2), encoding="utf-8")
        logger.info("Knowledge base written to %s", kb_path)


async def seed_problems() -> int:
    """Insert knowledge-base problems that are missing; return count added."""
    added = 0
    async with SessionLocal() as session:
        existing = set((await session.execute(select(Problem.slug))).scalars().all())
        for entry in PROBLEMS:
            if entry["slug"] in existing:
                continue
            session.add(
                Problem(
                    slug=entry["slug"],
                    leetcode_id=entry["leetcode_id"],
                    title=entry["title"],
                    difficulty=entry["difficulty"],
                    tags=entry["tags"],
                    pattern_key=entry.get("pattern"),
                    description=entry["summary"],
                    examples=[],
                    constraints=[],
                    url=entry["url"],
                )
            )
            added += 1
        await session.commit()
    if added:
        logger.info("Seeded %d problems", added)
    return added


async def init_db(seed: bool = True) -> None:
    configure_logging()
    await _ensure_data_dir()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tables ensured")
    if seed:
        await _write_knowledge_base_json()
        await seed_problems()


def main() -> None:
    asyncio.run(init_db())
    print("Database initialized.")


if __name__ == "__main__":
    main()

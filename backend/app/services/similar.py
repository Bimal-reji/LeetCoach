"""Similar-problems recommender.

Ranks the curated knowledge base by pattern + tag overlap with the current
problem, then buckets results by difficulty (Easy / Medium / Hard) as the
spec requires. Completely deterministic — no LLM call needed.
"""

from __future__ import annotations

from app.data.problems import PROBLEMS, PROBLEMS_BY_SLUG
from app.schemas.ai import SimilarProblem, SimilarResponse
from app.schemas.common import ProblemContext


def _similarity(current: ProblemContext, candidate: dict) -> float:
    """Jaccard-style score over tags + pattern identity."""
    if candidate["slug"] == current.slug:
        return -1.0  # never recommend the problem itself

    score = 0.0
    current_tags = {t.lower() for t in current.tags}
    cand_tags = {t.lower() for t in candidate["tags"]}
    if current_tags and cand_tags:
        score += 2.0 * len(current_tags & cand_tags) / max(1, len(current_tags | cand_tags))
    if candidate.get("pattern"):
        # pattern match is the strongest signal
        current_pattern = PROBLEMS_BY_SLUG.get(current.slug, {}).get("pattern", "")
        if current_pattern and candidate["pattern"] == current_pattern:
            score += 1.5
        # same difficulty is mildly preferred
    if candidate["difficulty"] == current.difficulty:
        score += 0.2
    return score


def recommend(problem: ProblemContext, limit: int = 9) -> SimilarResponse:
    """Return similar problems grouped by difficulty."""
    scored = sorted(PROBLEMS, key=lambda p: _similarity(problem, p), reverse=True)
    scored = [p for p in scored if _similarity(problem, p) > 0]

    def _to_out(p: dict) -> SimilarProblem:
        return SimilarProblem(
            slug=p["slug"],
            leetcode_id=p["leetcode_id"],
            title=p["title"],
            difficulty=p["difficulty"],
            tags=p["tags"],
            pattern=p.get("pattern", ""),
            url=p["url"],
        )

    easy = [_to_out(p) for p in scored if p["difficulty"] == "Easy"][: limit]
    medium = [_to_out(p) for p in scored if p["difficulty"] == "Medium"][: limit]
    hard = [_to_out(p) for p in scored if p["difficulty"] == "Hard"][: limit]
    return SimilarResponse(easy=easy, medium=medium, hard=hard, source="mock")

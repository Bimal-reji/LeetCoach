"""Pattern detection.

A deterministic scorer combines three signals:
1. Keyword matches against the problem text (title, tags, description).
2. Knowledge-base match — if the problem slug is known, its stored pattern
   is authoritative.
3. Tag-based boosting (LeetCode tags often imply a pattern family).

The result is grounded, explainable, and never hallucinated — and it runs
instantly without any LLM, so it works in mock mode.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.data.patterns import PATTERNS
from app.data.problems import PROBLEMS_BY_SLUG
from app.schemas.ai import PatternMatch, PatternResponse
from app.schemas.common import ProblemContext

# LeetCode tag -> likely pattern boost
TAG_HINTS: dict[str, str] = {
    "two pointers": "two_pointers",
    "sliding window": "sliding_window",
    "hash table": "hashmap",
    "prefix sum": "prefix_sum",
    "binary search": "binary_search",
    "binary indexed tree": "segment_tree",
    "segment tree": "segment_tree",
    "trie": "trie",
    "topological sort": "topological_sort",
    "monotonic stack": "monotonic_stack",
    "stack": "monotonic_stack",
    "bit manipulation": "bit_manipulation",
    "greedy": "greedy",
    "dynamic programming": "dp",
    "heap": "heap",
    "priority queue": "heap",
    "backtracking": "backtracking",
    "graph": "graph",
    "union find": "graph",
    "dfs": "dfs",
    "bfs": "bfs",
    "queue": "bfs",
}

_WS = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WS.sub(" ", text.lower()).strip()


@dataclass
class _Score:
    key: str
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)


def detect_pattern(problem: ProblemContext) -> PatternResponse:
    """Score every pattern and return the primary match plus alternatives."""
    scores: dict[str, _Score] = {key: _Score(key) for key in PATTERNS}

    # 1) Knowledge-base hit is authoritative.
    kb = PROBLEMS_BY_SLUG.get(problem.slug) if problem.slug else None
    if kb:
        kb_pattern = kb.get("pattern")
        if kb_pattern:
            scores[kb_pattern].score += 3.0
            scores[kb_pattern].reasons.append(
                f"Known problem: LeetCoach's curated base tags {kb_pattern} as the core pattern."
            )

    corpus = _normalize(
        " ".join(
            [
                problem.title,
                problem.description,
                " ".join(problem.tags),
                problem.slug.replace("-", " "),
            ]
        )
    )

    # 2) Keyword signals.
    for key, info in PATTERNS.items():
        for kw in info["keywords"]:
            if kw in corpus:
                scores[key].score += 0.5
                scores[key].reasons.append(f'Problem text contains "{kw}".')

    # 3) Tag boosts.
    for tag in problem.tags:
        mapped = TAG_HINTS.get(tag.lower())
        if mapped:
            scores[mapped].score += 1.0
            scores[mapped].reasons.append(f'Tag "{tag}" strongly implies {mapped.replace("_", " ")}.')

    ranked = sorted(scores.values(), key=lambda s: s.score, reverse=True)
    top = ranked[0]

    if top.score <= 0:
        # No signals: default to hashmap as a neutral fallback and say so.
        top = scores["hashmap"]
        top.reasons.append("No strong signals found; starting with the most common interview pattern.")

    def _to_match(entry: _Score) -> PatternMatch:
        info = PATTERNS[entry.key]
        confidence = min(1.0, entry.score / 3.0) if entry.score > 0 else 0.4
        reason = " ".join(entry.reasons[:3]) or info["explanation"]
        return PatternMatch(key=entry.key, name=info["name"], confidence=round(confidence, 2), reason=reason)

    alternatives = [_to_match(s) for s in ranked[1:4] if s.score > 0]

    primary = _to_match(top)
    return PatternResponse(
        primary=primary,
        alternatives=alternatives,
        explanation=PATTERNS[primary.key]["explanation"],
        when_to_use=PATTERNS[primary.key]["when_to_use"],
        source="mock",
    )

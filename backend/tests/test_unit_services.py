"""Unit tests for the rule-based services (no HTTP)."""

from __future__ import annotations

import pytest

from app.schemas.common import ProblemContext
from app.services.complexity import analyze_complexity
from app.services.mock import PATTERN_INSIGHT, MockProvider
from app.services.patterns import detect_pattern
from app.services.similar import recommend


def problem(**overrides) -> ProblemContext:
    base = {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "tags": ["Array", "Hash Table"],
        "description": "find two numbers that add up to target",
        "code": "def twoSum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []",
        "language": "python",
    }
    base.update(overrides)
    return ProblemContext(**base)


@pytest.mark.asyncio
async def test_mock_hints_progressive() -> None:
    provider = MockProvider()
    one = await provider.hints(problem(), 1)
    assert len(one.levels) == 1
    three = await provider.hints(problem(), 3)
    assert [lv.level for lv in three.levels] == [1, 2, 3]
    assert three.code_revealed is False
    # Hints must not contain runnable code
    assert "def " not in three.levels[0].hint


def test_pattern_detector_knowledge_base() -> None:
    result = detect_pattern(problem(slug="course-schedule", title="Course Schedule", tags=["DFS", "BFS", "Graph", "Topological Sort"], description="prerequisites graph, detect cycle"))
    assert result.primary.key == "topological_sort"


def test_complexity_nested_loops() -> None:
    code = "def f(nums):\n    res = []\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == 0:\n                res.append((i, j))\n    return res\n"
    result = analyze_complexity(problem(code=code))
    assert result.time_complexity == "O(n^2)"


def test_complexity_recursion() -> None:
    code = "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n"
    result = analyze_complexity(problem(code=code))
    assert "2^n" in result.time_complexity


def test_similar_recommendations_grouped() -> None:
    result = recommend(problem())
    assert result.easy or result.medium or result.hard
    all_problems = result.easy + result.medium + result.hard
    assert all(p.slug != "two-sum" for p in all_problems)


def test_pattern_insight_complete() -> None:
    from app.data.patterns import PATTERNS

    missing = set(PATTERNS.keys()) - set(PATTERN_INSIGHT.keys())
    assert not missing, f"Missing insight entries: {missing}"

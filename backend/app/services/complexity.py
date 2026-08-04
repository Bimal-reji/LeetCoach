"""Heuristic time/space complexity estimation.

A lightweight static analyzer inspects the user's code for loops, recursion,
sorting, and data structures, then produces an honest estimate with
explanations and optimization ideas. It never claims precision it doesn't
have — worst-case bounds are stated with the assumptions used.
"""

from __future__ import annotations

import re

from app.schemas.ai import ComplexityResponse
from app.schemas.common import ProblemContext

_SORT_CALL = re.compile(r"\b(sorted|sort|sort_by|std::sort|\.sort\(|Arrays\.sort|Collections\.sort)\b")
_RECURSIVE_CALL = re.compile(r"\b(def|function|fn)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)")


def analyze_complexity(problem: ProblemContext) -> ComplexityResponse:
    """Estimate complexity from code heuristics + problem constraints."""
    code = problem.code

    lines = code.splitlines()
    loop_count = 0
    nested_loops = False
    has_recursion = False
    has_sort = bool(_SORT_CALL.search(code))
    # Hash structure: explicit map types OR dict literals (seen = {}) OR
    # bracket-indexed assignments (seen[x] = ...) which are classic map usage.
    has_map = bool(
        re.search(r"\b(dict|HashMap|unordered_map|map|Set|HashSet|unordered_set|object)\b", code)
        or re.search(r"\{\s*\}\s*=", code)
        or re.search(r"\w+\[.*?\]\s*=", code)
    )
    has_heap = bool(re.search(r"\b(heap|heapq|PriorityQueue|priority_queue|minHeap|maxHeap|pq)\b", code))
    has_dp_array = bool(re.search(r"\b(dp|memo|cache|f\[|dp\[|\\[\\d+\\])\b", code))

    # Detect function names for recursion detection.
    funcs: list[str] = []
    for m in _RECURSIVE_CALL.finditer(code):
        funcs.append(m.group(2))

    # (Conservative) recursion check: the function name is invoked at least
    # twice with a call pattern (definition + >=1 recursive call). Counting
    # plain substring occurrences would false-positive on single letters.
    for fn in funcs:
        if len(re.findall(rf"\b{re.escape(fn)}\s*\(", code)) >= 2:
            has_recursion = True

    prev_indent: str | None = None
    for raw in lines:
        stripped = raw.strip()
        if not stripped or stripped.startswith(("#", "//", "/*", "*", '"""', "'''")):
            continue
        indent = raw[: len(raw) - len(raw.lstrip())]
        if prev_indent is not None and len(indent) > len(prev_indent) and re.match(r"\s*(for|while)\b", stripped):
            nested_loops = True
        if re.match(r"\b(for|while)\b", stripped):
            loop_count += 1
        prev_indent = indent

    # ---- Time complexity ----
    if has_recursion and has_dp_array:
        time = "O(n)" if loop_count <= 1 else "O(n * m)" if nested_loops else "O(n)"
        time_reason = "Recursion with memoization (top-down DP): each state computed once."
    elif has_recursion:
        time = "O(2^n)" if not has_map else "O(n * 2^n)"
        time_reason = "Recursive branching without (visible) memoization; exponential worst case."
    elif nested_loops:
        time = "O(n^2)" if loop_count <= 2 else "O(n^k)"
        time_reason = f"Nested loops detected ({loop_count} loop constructs, nesting depth ≥ 2)."
    elif loop_count >= 2:
        time = "O(n + m)"
        time_reason = "Multiple sequential loops over the input."
    elif loop_count == 1:
        time = "O(n)"
        time_reason = "Single pass over the input."
    elif has_sort:
        time = "O(n log n)"
        time_reason = "Dominant operation is a sort."
    else:
        time = "O(1)"
        time_reason = "No loops or sorts detected in the submitted code."

    # ---- Space complexity ----
    if has_dp_array and nested_loops:
        space = "O(n * m)"
        space_reason = "DP table with two dimensions."
    elif has_dp_array:
        space = "O(n)"
        space_reason = "DP/memoization array proportional to input size."
    elif has_heap:
        space = "O(k)"
        space_reason = "Heap/priority queue of bounded size."
    elif has_map:
        space = "O(n)"
        space_reason = "Hash map/set storing up to n entries."
    elif has_recursion:
        space = "O(n)"
        space_reason = "Call-stack depth proportional to input size."
    else:
        space = "O(1)"
        space_reason = "Only a constant amount of extra memory."

    optimizations = []
    if nested_loops:
        optimizations.append(
            "Consider whether a hash map or two-pointer scan can collapse the inner loop to O(n)."
        )
    if has_sort and loop_count > 0:
        optimizations.append("Sorting already dominates at O(n log n); avoid re-sorting inside loops.")
    if has_recursion and not has_dp_array:
        optimizations.append("Memoize overlapping subproblems (top-down DP) to avoid exponential rework.")
    if has_map and re.search(r"\b(dict|HashMap)\b", code):
        optimizations.append("Check that the hash lookup is in the hot path only; avoid re-creating maps per iteration.")
    if time == "O(n^2)":
        optimizations.append("Look for a two-pointer or sliding-window formulation if the array is sorted/has order.")
    if not optimizations:
        optimizations.append("Profile edge-case inputs (max constraints) to confirm the estimate holds in practice.")
    if "O(2^n)" in time:
        optimizations.append("Add memoization or switch to bottom-up DP to reduce to polynomial time.")

    return ComplexityResponse(
        time_complexity=time,
        space_complexity=space,
        explanation=f"{time_reason} Space: {space_reason}",
        optimizations=optimizations,
        source="mock",
    )

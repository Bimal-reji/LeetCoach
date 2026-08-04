"""Mock AI provider.

A fully offline, deterministic implementation of every AI feature. It uses
the curated knowledge base, the rule-based pattern detector, and the
heuristic complexity analyzer to produce genuinely useful (if less eloquent)
answers. This is the default provider — the whole product works with zero
API keys. ``groq.py`` mirrors this interface for LLM quality.
"""

from __future__ import annotations

import re
from collections.abc import AsyncIterator

from app.data.patterns import PATTERNS
from app.data.problems import PROBLEMS_BY_SLUG
from app.logging_conf import get_logger
from app.schemas.ai import (
    ComplexityResponse,
    DebugResponse,
    ExplainResponse,
    HintLevel,
    HintsResponse,
    InterviewFeedback,
    InterviewQuestion,
    InterviewResponse,
    LineExplanation,
    PatternResponse,
    ReviewFinding,
    ReviewResponse,
    SolutionResponse,
)
from app.schemas.chat import ChatRequest
from app.schemas.common import ProblemContext
from app.services.complexity import analyze_complexity
from app.services.patterns import detect_pattern

logger = get_logger(__name__)

# Staged, per-pattern hints: each level is a question/prompt, never a recipe.
HINT_LADDER: dict[str, tuple[str, str, str]] = {
    "two_pointers": (
        "If you scanned the collection from the front and back at the same time, what comparison could you make?",
        "A sorted (or sortable) input often lets a left and right pointer meet in the middle. What do you move when the pair is too small or too big?",
        "Each step must discard one candidate safely — argue why moving the smaller side never skips the answer.",
    ),
    "sliding_window": (
        "The problem talks about a *contiguous* segment. What summary (sum? counts?) could you maintain as it moves?",
        "Grow the window to the right until the constraint breaks, then shrink from the left. What invariant must hold while the window is valid?",
        "When the constraint is satisfied, how do you extend this to count all valid windows (or take the min/max length)?",
    ),
    "hashmap": (
        "Is there a lookup you keep repeating that a dictionary could answer in O(1)?",
        "Store something about each element as you scan — its complement, its count, or its first index. What exactly do you need to remember?",
        "One pass is usually enough if you both read from and write to the map as you go. Prove the ordering still finds every answer.",
    ),
    "prefix_sum": (
        "Can you re-express the query as a difference of two cumulative sums?",
        "Define prefix[i] = sum of the first i elements. Any range sum becomes prefix[b] - prefix[a]. What does that turn the question into?",
        "If you need to *count* ranges equal to k, combine prefix sums with a hash map of prefix frequencies.",
    ),
    "binary_search": (
        "Is the search space an array — or a *range of possible answers*? What predicate is monotonic?",
        "Define a feasible(mid) check. The answer is the boundary between feasible and not. Which side do you keep?",
        "Beware off-by-one: pick a loop invariant (lo < hi or lo <= hi) and stick to it; test both neighbors of the boundary.",
    ),
    "dfs": (
        "Can the state be a node in a tree/graph? What does exploring 'as deep as possible' look like here?",
        "Define the recursive step: what is the base case, and what do you return from a child to its parent?",
        "Think about what each recursion needs to *pass down* (visited set, running sum, bounds) vs *pass up* (best answer, height).",
    ),
    "bfs": (
        "Every edge is equal weight, so the first time you reach a node is the shortest way to reach it. Where do you start?",
        "Process the queue one whole level at a time — that level number is often the answer (steps, minutes, distance).",
        "Multi-source? Push every starting node into the queue before the loop begins and track a visited set to avoid revisits.",
    ),
    "dp": (
        "Define the state in one sentence: what is dp[i] (or dp[i][j]) the answer to?",
        "Write the recurrence in words first: how does dp[i] depend on dp[i-1], dp[i-2]...? Try the problem on a tiny example by hand.",
        "Check the base cases and the order you fill the table. Can you drop the table to two rolling variables?",
    ),
    "greedy": (
        "What is the 'locally optimal' choice at each step? Write down the invariant it preserves.",
        "A proof by exchange argument usually works here: if an optimal solution deviates from your greedy choice, swapping in your choice doesn't hurt.",
        "Ask yourself: does an early bad-looking choice ever force a later worse outcome? If never, greedy is correct.",
    ),
    "heap": (
        "You keep needing the current min/max of a changing set. What structure gives that in O(log n)?",
        "Keep a bounded-size heap (k elements) and let it evict the worst each step. What stays inside at the end?",
        "For 'merge k streams', push one element per stream and pop the smallest, then push its successor.",
    ),
    "trie": (
        "Strings share prefixes. What tree structure makes prefix queries proportional to the prefix length?",
        "Each node stores children by character and a flag for 'word ends here'. What must you add for counting or word-search pruning?",
        "In board problems, traverse the trie in parallel with the DFS so you prune the moment a prefix can't match.",
    ),
    "segment_tree": (
        "You need many range queries, but the array changes between queries. Why do prefix sums fail?",
        "Build a balanced tree where each node answers for its segment; combine children's answers for the parent.",
        "Point updates touch O(log n) nodes. For range *updates*, you'll need lazy propagation — do you?",
    ),
    "graph": (
        "Model the problem as nodes and edges. Are the edges explicit (given) or implicit (grid neighbours, valid transformations)?",
        "Pick traversal: DFS for connectivity/paths, BFS for shortest unweighted distance, union-find for pure component grouping.",
        "Always track visited state to avoid cycles; in grids, mark cells visited in-place when possible.",
    ),
    "topological_sort": (
        "This is a dependency problem. Can you draw every prerequisite as an arrow?",
        "Kahn's algorithm: repeatedly take nodes with in-degree 0. What does a leftover node (never processed) mean?",
        "If the graph has a cycle, no valid order exists — that's often the actual question (e.g., course schedule).",
    ),
    "backtracking": (
        "You're enumerating choices. Draw the decision tree: what does one node represent, and what are the branches?",
        "Recursion = make a choice, recurse, then undo it. Where does the 'undo' step go?",
        "Prune aggressively: sort/limit candidates, skip duplicates at the same level, and cut branches that can't reach a valid answer.",
    ),
    "monotonic_stack": (
        "For each element you want the nearest greater/smaller. What does 'nearest' suggest about a stack of pending elements?",
        "Keep the stack monotonic (e.g., strictly decreasing values). Popping an element answers its 'next greater' — where does that answer get recorded?",
        "Deques extend this to window problems: elements leave the front when out of range and the back when dominated.",
    ),
    "bit_manipulation": (
        "Could each bit be an independent subproblem? XOR has a beautiful cancellation property — when does it apply?",
        "n & (n - 1) clears the lowest set bit. How many times can you do that before n is zero?",
        "For subsets, a bitmask of length n enumerates all 2^n combinations — can you iterate them with a simple loop?",
    ),
}

# Key insight per pattern for level-3 style guidance / solution discussions.
PATTERN_INSIGHT: dict[str, str] = {
    "two_pointers": "Move the pointer that can only make the answer better; the other side is provably exhausted.",
    "sliding_window": "The window's summary makes rechecking the whole segment O(1) per position.",
    "hashmap": "Trading O(n) space buys O(1) lookups, turning an O(n^2) scan into O(n).",
    "prefix_sum": "Any range query collapses into a subtraction of two precomputed values.",
    "binary_search": "A monotonic predicate lets you search an answer space of values, not just an array.",
    "dfs": "The recursion stack is the path you're currently exploring.",
    "bfs": "Level order in an unweighted graph equals shortest distance.",
    "dp": "Overlapping subproblems are the smell; the recurrence is the cure.",
    "greedy": "A local choice that never blocks a global optimum is globally optimal.",
    "heap": "Bounded heaps keep 'top k' in O(n log k) instead of O(n log n).",
    "trie": "Shared prefixes mean you only pay for characters that differ.",
    "segment_tree": "Combine-able segments + updates => log-time range queries.",
    "graph": "Choosing the right traversal is the whole algorithm.",
    "topological_sort": "In-degree zero = nothing left to wait for.",
    "backtracking": "Undo is what turns brute force into a search.",
    "monotonic_stack": "Amortized O(1) pops give you 'next greater' for free.",
    "bit_manipulation": "Bits give O(1) space where a set would take O(n).",
}

CONCEPT_FAQ: dict[str, str] = {
    "dp": "Dynamic programming is just recursion + memoization done carefully. Steps: (1) define dp[i] precisely, (2) write the recurrence, (3) set base cases, (4) fill in safe order, (5) read off the answer. If your recursion recomputes the same subproblem, that's the signal to use DP.",
    "dynamic programming": "Dynamic programming is just recursion + memoization done carefully. Steps: (1) define dp[i] precisely, (2) write the recurrence, (3) set base cases, (4) fill in safe order, (5) read off the answer. If your recursion recomputes the same subproblem, that's the signal to use DP.",
    "bfs": "BFS explores a graph level by level using a queue. Because edges are unweighted, the first time you visit a node is via the shortest path. Use it for shortest steps, level-order, and multi-source expansion.",
    "dfs": "DFS dives as deep as possible before backtracking, using recursion or an explicit stack. Great for trees, paths, connectivity, and flood-fill. Watch the recursion depth limit for huge inputs.",
    "recursion": "Recursion solves a problem by solving smaller versions of itself. Every recursion needs (1) a base case that stops it, (2) a recursive case that shrinks the problem, and (3) a way to combine results. Trace it on a tiny example!",
    "binary search": "Binary search halves the search space each step. The powerful version searches *answers*: if feasible(x) is monotonic (false...true), binary search the boundary. Classic pitfalls are off-by-one and infinite loops — fix the invariant, not the examples.",
    "two pointers": "Two pointers scan from opposite ends (or different speeds) to compare pairs or detect cycles. Works great on sorted arrays: if a pair sum is too big, move the right pointer left; too small, move the left right.",
    "sliding window": "A window with a summary (sum, counts) slides over the array. Grow right until invalid, shrink left until valid. It turns 'longest substring with at most k X' style problems into O(n).",
    "hashmap": "A hash map gives O(1) average lookups. Use it for complements, frequency counting, de-duplication, and grouping by a key. It costs O(n) space — usually a fine trade.",
    "heap": "A heap (priority queue) exposes the min/max in O(log n) and supports inserts. Use a bounded k-size heap for 'top k' problems and for repeatedly taking the current extreme in greedy simulations.",
    "greedy": "Greedy makes the locally best choice each step and hopes it's globally optimal. Verify with an exchange argument: swapping your choice into any optimal solution never makes it worse.",
    "backtracking": "Backtracking enumerates all candidates via recursion, undoing each choice when a branch fails. The key to speed is pruning — skip branches that cannot succeed (sorted order, duplicate skipping).",
    "trie": "A trie stores strings by prefix, so insert/search cost O(L) where L is the word length. Use for prefix queries and to prune searches against a dictionary.",
    "monotonic stack": "A monotonic stack keeps elements in sorted order while scanning. When the next element breaks the order, the popped elements just found their 'next greater/smaller' — an O(n) trick for O(n^2) lookalikes.",
    "prefix sum": "Prefix sums precompute cumulative totals so any range sum is one subtraction. Combine with a hash map to *count* subarrays with a given sum.",
    "bit manipulation": "XOR is a cancellation machine: a ^ a = 0, so pairs vanish. n & (n-1) clears the lowest set bit. Use bits for compact state, flags, and subset masks.",
    "topological sort": "Topological sort orders a DAG so every edge points forward. Kahn's algorithm processes in-degree-0 nodes; leftover nodes mean a cycle — often the real question.",
    "segment tree": "A segment tree answers range queries (sum/min/max) and handles point updates in O(log n). Use it when the data changes between queries so prefix sums don't apply.",
    "graph": "First model nodes and edges, then pick traversal: BFS for shortest unweighted distance, DFS for paths/components, union-find for pure grouping. Never forget visited tracking.",
    "space complexity": "Space complexity counts extra memory beyond the input: hash maps O(n), recursion stack O(depth), in-place O(1).",
    "time complexity": "Time complexity is how runtime scales with input size n. Count dominant operations: single loop O(n), nested O(n^2), halving O(log n), sort O(n log n).",
}


class MockProvider:
    """Deterministic offline implementation of the AI interface."""

    name = "mock"

    # ------------------------------------------------------------ hints
    async def hints(self, problem: ProblemContext, levels_to_reveal: int) -> HintsResponse:
        pattern = detect_pattern(problem)
        kb = PROBLEMS_BY_SLUG.get(problem.slug) if problem.slug else None
        ladder = HINT_LADDER.get(pattern.primary.key, HINT_LADDER["hashmap"])

        levels = [
            HintLevel(
                level=1,
                title=f"Pattern family: {pattern.primary.name}",
                hint=ladder[0],
            ),
            HintLevel(
                level=2,
                title="Sharpen the approach",
                hint=ladder[1],
            ),
            HintLevel(
                level=3,
                title="Key insight",
                hint=ladder[2]
                + (
                    f" Problem-specific note: {kb['summary']}"
                    if kb
                    else f" Grounding insight: {PATTERN_INSIGHT.get(pattern.primary.key, '')}"
                ),
            ),
        ]
        return HintsResponse(
            pattern=pattern.primary.key,
            levels=levels[:levels_to_reveal],
            code_revealed=False,
            source=self.name,
        )

    # ------------------------------------------------------------ pattern
    async def pattern(self, problem: ProblemContext) -> PatternResponse:
        return detect_pattern(problem)

    # ------------------------------------------------------------ complexity
    async def complexity(self, problem: ProblemContext) -> ComplexityResponse:
        if not problem.code.strip():
            from app.schemas.ai import ComplexityResponse as CR

            return CR(
                time_complexity="—",
                space_complexity="—",
                explanation="No code provided yet — write a draft and re-run to analyze it.",
                optimizations=["Attempt a solution first; the analyzer needs code to inspect."],
                source=self.name,
            )
        return analyze_complexity(problem)

    # ------------------------------------------------------------ debug
    async def debug(self, problem: ProblemContext, error: str) -> DebugResponse:
        pattern = detect_pattern(problem)
        lowered = error.lower()
        mistakes: list[str] = []
        edge_cases: list[str] = []
        missing: list[str] = []
        tests: list[str] = []

        if "index out of range" in lowered or "indexerror" in lowered or "out of bounds" in lowered:
            mistakes.append("Index out of range: check loop boundaries and empty-input handling.")
            missing.append("A guard for empty input (n == 0) or off-by-one in the last index.")
        if "time limit" in lowered or "tle" in lowered:
            mistakes.append("Time Limit Exceeded suggests a slower-than-optimal algorithm or a hidden infinite loop.")
            tests.append("Run the worst-case input from the constraints to confirm complexity.")
        if "wrong answer" in lowered or "failed" in lowered:
            mistakes.append("Wrong Answer on hidden cases usually means a missed edge case or an incorrect assumption.")
            missing.append("Re-read constraints: negative numbers? zeros? duplicates? very large values?")
        if not mistakes:
            mistakes.append(
                f"Re-run with the failing input: is the state correctly initialised and updated for every branch "
                f"of the {pattern.primary.name} approach?"
            )

        edge_cases.append("Empty input (empty array / null tree / zero rows).")
        edge_cases.append("Single element / minimal size input.")
        edge_cases.append("Already sorted, reverse-sorted, or all-equal input.")
        edge_cases.append("Maximum constraints (large n, large values) to check overflow/time.")

        if pattern.primary.key in ("two_pointers", "sliding_window"):
            edge_cases.append("Duplicates at the window/pointer boundaries.")
        if pattern.primary.key == "hashmap":
            missing.append("Duplicate values that map to the same key — store the right one.")
        if pattern.primary.key in ("dp",):
            missing.append("Base cases: dp[0] / dp[1] / empty-prefix state.")
        if pattern.primary.key == "binary_search":
            missing.append("Termination: does the loop exit when the target is absent?")

        tests.append("Test with the examples given, plus the edge cases above, and assert exact outputs.")
        return DebugResponse(
            possible_mistakes=mistakes,
            edge_cases=edge_cases,
            missing_conditions=missing,
            suggested_tests=tests,
            source=self.name,
        )

    # ------------------------------------------------------------ review
    async def review(self, problem: ProblemContext) -> ReviewResponse:
        code = problem.code
        findings: list[ReviewFinding] = []
        lines = code.splitlines()

        # naming heuristics
        single_letters = [m for m in re.findall(r"\b([a-z])\b", code) if m]
        if len(single_letters) > 3:
            findings.append(
                ReviewFinding(
                    category="naming",
                    severity="warning",
                    message="Several single-letter variables make the algorithm harder to read.",
                    suggestion="Rename loop variables to describe their role (e.g., left/right, i/j are fine for indexes, but counts/maps deserve names).",
                )
            )

        # dead code / unreachable
        if re.search(r"print\(|console\.log|printf\(", code) and "debug" not in code.lower():
            findings.append(
                ReviewFinding(
                    category="dead_code",
                    severity="info",
                    message="Leftover print/console.log statements.",
                    suggestion="Remove debug prints before submitting.",
                )
            )

        # duplication
        patterns = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith(("#", "//"))]
        seen: dict[str, int] = {}
        for p in patterns:
            seen[p] = seen.get(p, 0) + 1
        dup = [p for p, c in seen.items() if c >= 3]
        if dup:
            findings.append(
                ReviewFinding(
                    category="duplication",
                    severity="warning",
                    message="Identical code blocks appear multiple times.",
                    suggestion="Extract a helper function or use a loop over the repeated operation.",
                )
            )

        # memory
        if re.search(r"\b(list|array|\\[\\])", code) and len(lines) < 30:
            findings.append(
                ReviewFinding(
                    category="memory",
                    severity="info",
                    message="Consider whether the auxiliary array can be replaced by rolling variables or an in-place approach.",
                    suggestion="Check the space complexity: can it be reduced to O(1) or O(k)?",
                )
            )

        # correctness guard
        if not re.search(r"return", code):
            findings.append(
                ReviewFinding(
                    category="correctness",
                    severity="critical",
                    message="No return statement found.",
                    suggestion="Ensure every code path returns the expected value.",
                )
            )

        if not findings:
            findings.append(
                ReviewFinding(
                    category="readability",
                    severity="info",
                    message="Code reads cleanly.",
                    suggestion="Consider adding short comments explaining the algorithm's invariant.",
                )
            )

        rating = max(1, 10 - sum(2 if f.severity == "critical" else 1 if f.severity == "warning" else 0 for f in findings))
        summary = (
            "Solid draft. A few naming and clarity improvements would take it from working to polished."
            if findings[0].severity in ("warning", "info") and len(findings) <= 2
            else "There are a few things worth fixing before this is submission-ready."
        )
        return ReviewResponse(rating=rating, summary=summary, findings=findings, source=self.name)

    # ------------------------------------------------------------ explain
    async def explain(self, problem: ProblemContext, mode: str) -> ExplainResponse:
        code = problem.code
        lines = code.splitlines()
        explanations: list[LineExplanation] = []
        prev_comment = ""
        for idx, raw in enumerate(lines, start=1):
            stripped = raw.strip()
            if not stripped:
                continue
            if stripped.startswith(("#", "//")):
                prev_comment = stripped.lstrip("#/").strip()
                continue
            text = self._explain_line(stripped, mode)
            if prev_comment and mode in ("beginner", "intermediate"):
                text = f"{prev_comment} — {text}"
                prev_comment = ""
            explanations.append(LineExplanation(line=idx, code=stripped, explanation=text))

        overview = {
            "beginner": "This code runs top to bottom; the loop repeats the block inside it for each item.",
            "intermediate": "The structure mixes initialization, iteration, and a decision made inside the loop.",
            "interview": "Walk through the approach and its complexity when presenting this in an interview.",
        }.get(mode, "Walk through the code step by step.")
        return ExplainResponse(mode=mode, overview=overview, lines=explanations, source=self.name)

    @staticmethod
    def _explain_line(stripped: str, mode: str) -> str:
        if re.match(r"^(def|function|fn|class)\b", stripped):
            return "Declares the entry point — this is where execution (and the interview discussion) starts."
        if re.match(r"^(for|while)\b", stripped):
            return "Starts a loop: the body repeats for each iteration, which usually drives the time complexity."
        if re.match(r"^(if|elif|else)\b", stripped) or "?" in stripped:
            return "A decision point — one branch runs depending on the condition; interviewers probe which branch handles edge cases."
        if "return" in stripped:
            return "Returns the result, ending this call. Double-check the value is the right one on every path."
        if re.search(r"\b(dict|HashMap|map|set|Set)\b", stripped):
            return "Creates/uses a hash structure — O(1) average lookups are the whole point here."
        if mode == "beginner":
            return "Assigns or transforms a value; the variable name hints at what it stores."
        return "Core logic step — consider what invariant this line maintains for the rest of the algorithm."

    # ------------------------------------------------------------ interview
    async def interview(self, problem: ProblemContext) -> InterviewResponse:
        pattern = detect_pattern(problem)
        key = pattern.primary.key
        questions = [
            InterviewQuestion(
                id="q1",
                question="Why did you choose this algorithm/approach?",
                expected_points=[
                    "Name the pattern and what signal in the problem pointed to it",
                    "Mention why brute force is insufficient (complexity)",
                    "Tie it to constraints (n up to 10^5 → need O(n log n) or better)",
                ],
            ),
            InterviewQuestion(
                id="q2",
                question="Can it be optimized? What's the current complexity and where is the bottleneck?",
                expected_points=[
                    "State time & space complexity precisely",
                    "Identify the dominant term (inner loop, sort, recursion)",
                    "Propose a concrete improvement (map, pointers, memoization)",
                ],
            ),
            InterviewQuestion(
                id="q3",
                question="What's the trickiest edge case for this problem, and how does your solution handle it?",
                expected_points=[
                    "Empty / minimal input",
                    "Duplicates, negatives, or extreme values from constraints",
                    "Boundary behaviour of the " + PATTERNS[key]["name"] + " technique",
                ],
            ),
            InterviewQuestion(
                id="q4",
                question="How would you solve it recursively (or iteratively, if you solved it recursively)?",
                expected_points=[
                    "Translate the algorithm to the other style",
                    "Identify the base case and the recursive step",
                    "Mention stack depth / memory differences",
                ],
            ),
        ]
        return InterviewResponse(questions=questions, source=self.name)

    async def interview_feedback(self, problem: ProblemContext, question_id: str, answer: str) -> InterviewFeedback:
        pattern = detect_pattern(problem)
        length_ok = len(answer.strip()) >= 60
        has_complexity = bool(re.search(r"O\([nN]( log n)?\)", answer))
        has_pattern = bool(re.search(r"pointer|window|hash|dynamic|recurs|stack|queue|greed|binary|memo", answer, re.I))
        score = 4 + (2 if length_ok else 0) + (2 if has_complexity else 0) + (2 if has_pattern else 0)
        score = min(score, 10)
        feedback = (
            "Good structured answer — you covered complexity and pattern intuition."
            if score >= 8
            else "Decent start. Interviewers want: (1) the pattern and why, (2) precise complexity, (3) an edge case you handle."
        )
        improvements = []
        if not has_complexity:
            improvements.append("Always state time & space complexity explicitly (Big-O notation).")
        if not has_pattern:
            improvements.append("Name the algorithmic pattern and the problem signal that suggested it.")
        if not length_ok:
            improvements.append("Expand with a concrete trace or edge-case example.")
        return InterviewFeedback(
            score=score,
            feedback=feedback,
            what_to_improve=improvements,
            sample_answer=(
                f"I identified {pattern.primary.name} as the fit because {pattern.primary.reason} "
                f"The complexity is O(n) time, O(1) space, and the edge case to watch is minimal input sizes."
            ),
            source=self.name,
        )

    # ------------------------------------------------------------ solution
    async def solution(self, problem: ProblemContext) -> SolutionResponse:
        pattern = detect_pattern(problem)
        kb = PROBLEMS_BY_SLUG.get(problem.slug) if problem.slug else None
        info = PATTERNS[pattern.primary.key]
        template = SOLUTION_TEMPLATES.get(
            pattern.primary.key, SOLUTION_TEMPLATES["hashmap"]
        ).replace("__FUNC__", infer_function_name(problem))
        explanation = (
            f"Approach: {info['explanation']} "
            f"Complexity guide: {info['complexity_guide']}."
        )
        if kb:
            explanation += f" Context: {kb['summary']}"
        return SolutionResponse(solution=template, explanation=explanation, language=problem.language, source=self.name)

    # ------------------------------------------------------------ chat
    async def chat(self, request: ChatRequest) -> AsyncIterator[str]:
        msg = request.message.lower()
        reply = ""

        # Concept questions from the FAQ.
        for topic, answer in CONCEPT_FAQ.items():
            if topic in msg:
                reply = answer
                break

        if not reply and request.problem and request.problem.has_problem:
            pattern = detect_pattern(request.problem)
            if "hint" in msg or "hint" in request.message.lower():
                ladder = HINT_LADDER.get(pattern.primary.key, HINT_LADDER["hashmap"])
                reply = f"For {request.problem.title}: {ladder[0]}"
            elif "solution" in msg or "code" in msg:
                reply = "I can reveal the solution — press 'Show Solution' on the problem card (I avoid spoiling it by default, that's the deal 😉)."
            else:
                reply = (
                    f"This problem ({request.problem.title or request.problem.slug}) looks like {pattern.primary.name}. "
                    f"{pattern.primary.reason} Want a hint, a complexity walkthrough, or a deeper explanation?"
                )

        if not reply:
            reply = (
                "I can explain DSA concepts (try \"explain DP\", \"what is BFS\", \"explain recursion\"), "
                "or coach you on the problem on screen. What would help right now?"
            )
        # Stream the reply in small chunks.
        for i in range(0, len(reply), 48):
            yield reply[i : i + 48]
            # no await needed for deterministic mock; keep signature compatible

    # ------------------------------------------------------------ flashcards
    async def generate_flashcards(self, problem: ProblemContext, count: int) -> list[dict]:
        pattern = detect_pattern(problem)
        kb = PROBLEMS_BY_SLUG.get(problem.slug)
        title = problem.title or problem.slug or "this problem"
        info = PATTERNS[pattern.primary.key]
        cards = [
            {
                "question": f"What algorithmic pattern fits '{title}' and what signal in the problem pointed to it?",
                "answer": f"{pattern.primary.name} — {pattern.primary.reason}",
            },
            {
                "question": f"For '{title}', what is the expected time and space complexity of the optimal approach?",
                "answer": f"Complexity guide: {info['complexity_guide']}",
            },
            {
                "question": f"Describe the key insight (the 'aha') behind solving '{title}' efficiently.",
                "answer": kb["summary"] if kb else info["explanation"],
            },
            {
                "question": "What edge case would you test first for this problem, and why?",
                "answer": "Empty/minimal input, then the extremes from the constraints (duplicates, negatives, max size).",
            },
        ]
        if count > len(cards) and pattern.primary.key in PATTERN_INSIGHT:
            cards.append(
                {
                    "question": "One-line memory hook: summarize the core trick of this technique.",
                    "answer": PATTERN_INSIGHT[pattern.primary.key],
                }
            )
        return cards[:count]


# ------------------------------------------------------------------ helpers
def infer_function_name(problem: ProblemContext) -> str:
    sig = problem.function_signature or {}
    return str(sig.get("name", "solve") or "solve")


def pattern_reason(problem: ProblemContext) -> str:
    return detect_pattern(problem).primary.reason


SOLUTION_TEMPLATES: dict[str, str] = {
    "two_pointers": """# Two-pointer template (adapted to the exact signature)
def __FUNC__(self, ...):
    left, right = 0, len(arr) - 1
    while left < right:
        # compare arr[left] and arr[right]; move the pointer that
        # can only improve the answer
        if condition:
            left += 1
        else:
            right -= 1
    return best""",
    "sliding_window": """# Sliding-window template
def __FUNC__(self, ...):
    left = 0
    summary = ...          # sum / Counter / set
    best = ...
    for right in range(n):
        update(summary, arr[right])
        while invalid(summary):   # shrink
            update(summary, arr[left], remove=True)
            left += 1
        best = max(best, right - left + 1)
    return best""",
    "hashmap": """# Hash-map template
def __FUNC__(self, ...):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []""",
    "prefix_sum": """# Prefix-sum template
def __FUNC__(self, ...):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    # any range [l, r] sum == prefix[r+1] - prefix[l]
    return prefix""",
    "binary_search": """# Binary search on answers template
def __FUNC__(self, ...):
    lo, hi = min_possible, max_possible
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo""",
    "dfs": """# Recursive DFS template
def __FUNC__(self, ...):
    def dfs(node, state):
        if node is None:            # base case
            return ...
        result = combine(dfs(node.left, ...), dfs(node.right, ...))
        return result
    return dfs(root, initial_state)""",
    "bfs": """# BFS template
def __FUNC__(self, ...):
    from collections import deque
    q = deque([start])
    visited = {start}
    steps = 0
    while q:
        for _ in range(len(q)):      # one level at a time
            node = q.popleft()
            if is_goal(node): return steps
            for nxt in neighbors(node):
                if nxt not in visited:
                    visited.add(nxt); q.append(nxt)
        steps += 1
    return -1""",
    "dp": """# DP template
def __FUNC__(self, ...):
    dp = [0] * (n + 1)
    dp[0] = base_case
    for i in range(1, n + 1):
        dp[i] = recurrence(dp, i)
    return dp[n]""",
    "greedy": """# Greedy template
def __FUNC__(self, ...):
    items.sort(key=...)          # usually needs a smart order
    best = 0
    for x in items:
        if compatible(best, x):
            best = x             # local choice
    return result""",
    "heap": """# K-sized heap template
def __FUNC__(self, ...):
    import heapq
    heap = []
    for x in items:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)   # evict worst -> top k remain
    return heap""",
    "trie": """# Trie template
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True
    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children: return False
            node = node.children[ch]
        return node.is_end""",
    "segment_tree": """# Segment tree (range sum, point update)
def __FUNC__(self, ...):
    n = len(nums)
    tree = [0] * (4 * n)
    def build(node, l, r):
        if l == r: tree[node] = nums[l]
        else:
            m = (l + r) // 2
            build(2*node, l, m); build(2*node+1, m+1, r)
            tree[node] = tree[2*node] + tree[2*node+1]
    def update(node, l, r, idx, val):
        if l == r: tree[node] = val
        else:
            m = (l + r) // 2
            if idx <= m: update(2*node, l, m, idx, val)
            else: update(2*node+1, m+1, r, idx, val)
            tree[node] = tree[2*node] + tree[2*node+1]
    def query(node, l, r, ql, qr):
        if ql > r or qr < l: return 0
        if ql <= l and r <= qr: return tree[node]
        m = (l + r) // 2
        return query(2*node, l, m, ql, qr) + query(2*node+1, m+1, r, ql, qr)
    return build, update, query""",
    "graph": """# Graph traversal template
def __FUNC__(self, ...):
    visited = set()
    def dfs(node):
        visited.add(node)
        for nxt in graph.get(node, []):
            if nxt not in visited:
                dfs(nxt)
    for node in nodes:
        if node not in visited:
            dfs(node); components += 1
    return components""",
    "topological_sort": """# Kahn's topological sort
def __FUNC__(self, ...):
    from collections import deque
    indeg = {u: 0 for u in nodes}
    for u, v in edges: indeg[v] += 1
    q = deque([u for u in nodes if indeg[u] == 0])
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == len(nodes) else []  # [] => cycle""",
    "backtracking": """# Backtracking template
def __FUNC__(self, ...):
    res = []
    def backtrack(path, options):
        if is_solution(path):
            res.append(path[:]); return
        for choice in options:
            if not valid(choice, path): continue   # prune
            path.append(choice)
            backtrack(path, options)
            path.pop()                             # undo
    backtrack([], options)
    return res""",
    "monotonic_stack": """# Monotonic stack (next greater)
def __FUNC__(self, ...):
    stack, result = [], [0] * n
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            result[stack.pop()] = x
        stack.append(i)
    return result""",
    "bit_manipulation": """# XOR single-number template
def __FUNC__(self, ...):
    xor = 0
    for x in nums:
        xor ^= x
    return xor""",
}

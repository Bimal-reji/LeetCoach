"""Tests for the AI mentor endpoints (mock provider)."""

from __future__ import annotations

from conftest import sample_problem


def _post(client, path, body, headers):
    return client.post(f"/api/v1/ai{path}", json=body, headers=headers)


def test_hints(client, device_headers) -> None:
    resp = _post(client, "/hints", {"problem": sample_problem(), "levels_to_reveal": 1}, device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["code_revealed"] is False
    assert len(body["levels"]) == 1
    assert body["levels"][0]["level"] == 1
    assert body["levels"][0]["hint"]


def test_hints_full_ladder(client, device_headers) -> None:
    resp = _post(client, "/hints", {"problem": sample_problem(), "levels_to_reveal": 3}, device_headers)
    assert resp.status_code == 200
    assert [lvl["level"] for lvl in resp.json()["levels"]] == [1, 2, 3]


def test_pattern_two_sum(client, device_headers) -> None:
    resp = _post(client, "/pattern", sample_problem(), device_headers)
    assert resp.status_code == 200
    body = resp.json()
    # Two Sum is tagged Array/Hash Table and known in the KB -> hashmap
    assert body["primary"]["key"] == "hashmap"
    assert body["primary"]["confidence"] > 0
    assert body["explanation"]


def test_pattern_sliding_window(client, device_headers) -> None:
    prob = sample_problem(
        slug="longest-substring-without-repeating-characters",
        title="Longest Substring Without Repeating Characters",
        tags=["Hash Table", "String", "Sliding Window"],
        description="Given a string s, find the length of the longest substring without repeating characters.",
    )
    resp = _post(client, "/pattern", prob, device_headers)
    assert resp.json()["primary"]["key"] == "sliding_window"


def test_complexity(client, device_headers) -> None:
    resp = _post(client, "/complexity", sample_problem(), device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["time_complexity"] == "O(n)"
    assert body["space_complexity"] == "O(n)"
    assert body["optimizations"]


def test_complexity_no_code(client, device_headers) -> None:
    prob = sample_problem(code="", language="python")
    resp = _post(client, "/complexity", prob, device_headers)
    assert resp.status_code == 200


def test_debug(client, device_headers) -> None:
    body = {"problem": sample_problem(), "error": "IndexError: list index out of range"}
    resp = _post(client, "/debug", body, device_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["possible_mistakes"]
    assert data["edge_cases"]
    assert any("index out of range" in m.lower() for m in data["possible_mistakes"])


def test_review(client, device_headers) -> None:
    prob = sample_problem(
        code="def f(n):\n    x=0\n    for i in range(n):\n        x=x+i\n    print(x)\n    return x\n"
    )
    resp = _post(client, "/review", prob, device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert 1 <= body["rating"] <= 10
    assert body["findings"]


def test_explain(client, device_headers) -> None:
    resp = _post(client, "/explain", {"problem": sample_problem(), "mode": "beginner"}, device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "beginner"
    assert body["lines"]
    assert all(line["explanation"] for line in body["lines"])


def test_interview_and_feedback(client, device_headers) -> None:
    resp = _post(client, "/interview", sample_problem(), device_headers)
    assert resp.status_code == 200
    questions = resp.json()["questions"]
    assert len(questions) == 4

    fb = _post(
        client,
        "/interview/feedback",
        {
            "problem": sample_problem(),
            "question_id": "q1",
            "answer": "I used a hash map because we need O(1) complement lookup; overall O(n) time and O(n) space. Edge case: duplicates in the array.",
        },
        device_headers,
    )
    assert fb.status_code == 200
    assert 0 <= fb.json()["score"] <= 10


def test_solution_reveals_code(client, device_headers) -> None:
    resp = _post(client, "/solution", sample_problem(), device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "def " in body["solution"]
    assert body["explanation"]


def test_similar(client, device_headers) -> None:
    resp = _post(client, "/similar", sample_problem(), device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["easy"] and body["medium"] and body["hard"]
    assert all(p["slug"] != "two-sum" for p in body["easy"] + body["medium"] + body["hard"])


def test_daily(client, device_headers) -> None:
    resp = client.get("/api/v1/ai/daily", headers=device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["problem"]["slug"]
    assert body["plan"]

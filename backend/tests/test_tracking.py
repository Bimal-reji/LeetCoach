"""Tests for tracking features: problems, attempts, progress, notes, flashcards, leaderboard."""

from __future__ import annotations

from conftest import sample_problem


def test_upsert_problem_and_attempt(client, device_headers) -> None:
    resp = client.post(
        "/api/v1/problems",
        json={"problem": sample_problem(), "status": "accepted", "first_try": True, "time_ms": 900000},
        headers=device_headers,
    )
    assert resp.status_code == 201
    problem = resp.json()
    assert problem["slug"] == "two-sum"
    assert problem["tags"] == ["Array", "Hash Table"]


def test_progress_after_solving(client, device_headers) -> None:
    client.post(
        "/api/v1/problems",
        json={"problem": sample_problem(), "status": "accepted", "first_try": True, "time_ms": 900000},
        headers=device_headers,
    )
    resp = client.get("/api/v1/progress", headers=device_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["solved_count"] >= 1
    assert body["points"] >= 15  # 10 solved + 5 first-try + 0 easy
    assert body["streak"] >= 1
    assert any(t["topic"] == "Hash Table" for t in body["topics"])
    assert len(body["heatmap"]) == 90


def test_notes_crud(client, device_headers) -> None:
    created = client.post(
        "/api/v1/notes",
        json={"problem_slug": "two-sum", "title": "Key insight", "body": "Complement lookup via dict.", "tags": ["hash"]},
        headers=device_headers,
    )
    assert created.status_code == 201
    note_id = created.json()["id"]

    listed = client.get("/api/v1/notes?problem_slug=two-sum", headers=device_headers).json()
    assert len(listed) == 1

    updated = client.put(
        f"/api/v1/notes/{note_id}", json={"body": "Use dict + enumerate in one pass."}, headers=device_headers
    )
    assert updated.json()["body"].startswith("Use dict")

    deleted = client.delete(f"/api/v1/notes/{note_id}", headers=device_headers)
    assert deleted.json()["deleted"] is True


def test_flashcards_crud_and_review(client, device_headers) -> None:
    created = client.post(
        "/api/v1/flashcards",
        json={"problem_slug": "two-sum", "question": "What pattern is Two Sum?", "answer": "Hash map complement lookup."},
        headers=device_headers,
    )
    assert created.status_code == 201
    card_id = created.json()["id"]
    assert created.json()["box"] == 0

    reviewed = client.post(f"/api/v1/flashcards/{card_id}/review", json={"recalled": True}, headers=device_headers)
    assert reviewed.json()["box"] == 1
    assert reviewed.json()["review_count"] == 1


def test_flashcard_generation(client, device_headers) -> None:
    resp = client.post(
        "/api/v1/ai/flashcards/generate",
        json={"problem_slug": "two-sum", "count": 4},
        headers=device_headers,
    )
    assert resp.status_code == 200
    cards = resp.json()
    assert len(cards) == 4
    assert all(c["question"] and c["answer"] for c in cards)


def test_revisions_crud(client, device_headers) -> None:
    created = client.post(
        "/api/v1/revisions",
        json={"problem_slug": "two-sum", "kind": "mistake", "content": "Forgot duplicate handling."},
        headers=device_headers,
    )
    assert created.status_code == 201
    listed = client.get("/api/v1/revisions?kind=mistake", headers=device_headers).json()
    assert len(listed) >= 1
    assert client.delete(f"/api/v1/revisions/{created.json()['id']}", headers=device_headers).json()["deleted"]


def test_leaderboard(client, device_headers) -> None:
    resp = client.get("/api/v1/leaderboard", headers=device_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_invalid_device_rejected(client) -> None:
    # Header shorter than 8 chars must be rejected
    resp = client.post(
        "/api/v1/ai/hints",
        json={"problem": sample_problem(), "levels_to_reveal": 1},
        headers={"X-Device-Id": "short"},
    )
    assert resp.status_code == 400

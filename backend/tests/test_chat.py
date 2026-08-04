"""Tests for the streaming chat endpoint and conversation memory."""

from __future__ import annotations


def test_chat_streams(client, device_headers) -> None:
    with client.stream(
        "POST",
        "/api/v1/chat",
        json={"message": "explain DP", "history": []},
        headers=device_headers,
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = "".join(resp.iter_text())
    assert "data:" in body
    assert "done" in body


def test_chat_memory_roundtrip(client, device_headers) -> None:
    client.post(
        "/api/v1/chat",
        json={"message": "explain BFS", "history": []},
        headers=device_headers,
    )
    history = client.get("/api/v1/chat/history", headers=device_headers).json()["history"]
    assert any("BFS" in m["content"] for m in history if m["role"] == "assistant")

    cleared = client.delete("/api/v1/chat/history", headers=device_headers).json()
    assert cleared["cleared"] is True


def test_chat_grounded_in_problem(client, device_headers) -> None:
    problem = {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "tags": ["Array", "Hash Table"],
        "description": "return indices of two numbers that add up to target",
        "code": "",
        "language": "python",
    }
    with client.stream(
        "POST",
        "/api/v1/chat",
        json={"message": "hint please", "problem": problem, "history": []},
        headers=device_headers,
    ) as resp:
        body = "".join(resp.iter_text())
    assert "Two Sum" in body or "two_sum" in body

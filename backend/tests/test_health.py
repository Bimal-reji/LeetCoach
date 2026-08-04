"""Health endpoint tests."""

from __future__ import annotations


def test_health(client) -> None:
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in ("ok", "degraded")
    assert body["ai_provider"] == "mock"
    assert body["database"] == "ok"


def test_root(client) -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["version"]

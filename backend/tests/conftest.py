"""Shared test fixtures.

Important: environment is configured BEFORE the app is imported so the
settings singleton and the engine pick up the test database.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

_TMP = tempfile.mkdtemp(prefix="leetcoach_test_")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{Path(_TMP) / 'test.db'}"
os.environ["RAG_ENABLED"] = "false"
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"
os.environ["DEFAULT_DEVICE_ID"] = "test-device-0001"
os.environ["LOG_LEVEL"] = "ERROR"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

DEVICE_ID = "test-device-0001"
DEVICE_HEADERS = {"X-Device-Id": DEVICE_ID}


@pytest.fixture(scope="session")
def client():
    """TestClient with the FastAPI lifespan (db init + seeding) applied."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def device_headers() -> dict:
    return dict(DEVICE_HEADERS)


def sample_problem(**overrides) -> dict:
    """A realistic extracted problem payload."""
    payload = {
        "slug": "two-sum",
        "leetcode_id": 1,
        "title": "Two Sum",
        "difficulty": "Easy",
        "tags": ["Array", "Hash Table"],
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "examples": [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
        "function_signature": {"name": "twoSum", "params": ["nums", "target"]},
        "url": "https://leetcode.com/problems/two-sum/",
        "code": "def twoSum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []",
        "language": "python",
    }
    payload.update(overrides)
    return payload

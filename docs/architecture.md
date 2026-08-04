# Architecture

## System overview

```mermaid
flowchart LR
    subgraph Browser
        LC[leetcode.com]
        CS[Content Script<br/>extracts problem + code]
        SP[Side Panel (React)<br/>hints · pattern · complexity · chat]
        BG[Background SW<br/>device id · context menu · notifications]
        PO[Popup]
        CS -->|messages| BG
        BG <-->|chrome.storage| SP
        CS -->|detected problem| SP
    end

    subgraph Backend
        API[FastAPI /api/v1]
        CORE[CoachService]
        MOCK[Mock AI provider<br/>offline, deterministic]
        GROQ[Groq provider<br/>llama-3.3-70b-versatile]
        RAG[RAG retriever<br/>FAISS / keyword]
        DB[(SQLite → Postgres)]
        CACHE[(Redis → in-memory)]
        API --> CORE
        CORE --> MOCK
        CORE --> GROQ
        CORE --> RAG
        API --> DB
        API --> CACHE
    end

    SP -->|fetch + SSE| API
    PO -->|fetch| API
    DASH[Dashboard (React)<br/>progress · flashcards · leaderboard] -->|fetch + SSE| API
```

## Runtime data flow

1. **Detection** — the content script polls the DOM every 1.5s, extracts the
   problem (title, difficulty, tags, description, examples, constraints,
   signature, language, code), and pushes it to the background worker, which
   caches it in `chrome.storage.local`.
2. **Coaching** — the side panel reads the cached problem, calls the backend
   (`POST /api/v1/ai/*`), and renders hints/patterns/complexity. The solution
   endpoint is the *only* one that reveals code, and the UI requires an
   explicit confirm.
3. **Persistence** — solving a problem records an `Attempt`; the stats service
   updates points, streaks, and unique-solved counts. Analytics derives topic
   strengths and heatmaps on demand.
4. **Chat** — the side panel streams SSE deltas from `POST /api/v1/chat`;
   conversation memory is kept per device in the cache layer (Redis when
   configured, in-memory otherwise).

## Module responsibilities

| Module | Responsibility |
|--------|----------------|
| `extension/src/content` | DOM extraction + change detection (SPA-safe) |
| `extension/src/background` | Device identity, caching, context menus, shortcuts, notifications |
| `extension/src/sidepanel` | The in-LeetCode mentor UI (11 tools) |
| `backend/app/services` | Domain logic: providers, pattern detection, complexity heuristics, analytics |
| `backend/app/api` | Thin routers; dependency injection for device id + rate limiting |
| `backend/app/models` | SQLAlchemy ORM (async) |
| `backend/app/core` | Cache abstraction, error hierarchy |
| `frontend/src` | Web dashboard: progress, flashcards, leaderboard, chat, AI coach |

## Design decisions

- **Provider interface** — `CoachService` wraps `MockProvider` and
  `GroqProvider`, which implement the same method signatures. The active
  provider is chosen from settings, so no route code ever knows which AI is
  running. Groq failures automatically degrade to the mock.
- **Deterministic ground truth** — pattern detection and complexity estimation
  are rule-based and instant; the LLM (when enabled) only *enriches* prose,
  never decides the pattern.
- **Auth-free identity** — a per-device UUID keeps v1 simple; the
  `get_device_id` dependency in `app/api/deps.py` is the single point to swap
  for Firebase JWT verification.
- **Zero-config default** — SQLite + in-memory cache + mock AI means `uvicorn
  app.main:app` just works. Every dependency is optional and detected at
  startup.

## Database schema

```
problems (slug PK, leetcode_id, title, difficulty, pattern_key, tags[], …)
attempts (device_id, problem_slug FK, status, language, code, time_ms, first_try, tags[])
user_stats (device_id PK, points, streak, longest_streak, solved_count, …)
notes (device_id, problem_slug FK?, title, body, tags[])
flashcards (device_id, problem_slug FK?, question, answer, box, next_review_at)
revisions (device_id, problem_slug FK?, kind, content)
```

## Security model

- Per-device rate limiting (sliding window, 60 req/min default)
- Pydantic validation on every request body
- Prompt length caps + role filtering on chat history (XSS/leak guard)
- CORS restricted in production; JWT-ready auth seam
- All secrets via environment variables — never in code

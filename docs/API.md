# API Reference

Base URL: `http://localhost:8000/api/v1` · Interactive docs: `/docs` ·
Machine-readable spec: [api/openapi.json](../api/openapi.json) (OpenAPI 3.1).

## Authentication

v1 is **auth-free**. Send your device identity header:

```
X-Device-Id: <8–128 char id>
```

Missing/short headers are rejected with `400`. (Firebase Auth will replace
this seam — see `app/api/deps.py`.)

Errors use a consistent shape:

```json
{ "error": { "code": "validation_error", "message": "…", "details": […] } }
```

---

## Health

### `GET /health`
```json
{ "status": "ok", "version": "1.0.0", "ai_provider": "mock", "database": "ok", "cache": "ok" }
```

---

## Problems & attempts

### `POST /problems` — register a problem + attempt
```json
{
  "problem": { "slug": "two-sum", "title": "Two Sum", "difficulty": "Easy",
               "tags": ["Array","Hash Table"], "description": "…",
               "examples": [], "constraints": [], "function_signature": {},
               "url": "…", "code": "def twoSum…", "language": "python" },
  "status": "accepted", "first_try": true, "time_ms": 540000
}
```
`status`: `accepted | wrong | attempted | solved`.

### `GET /problems?difficulty=Easy&tag=Array` / `GET /problems/{slug}`
### `POST /problems/{slug}/attempts`

---

## AI mentor

All AI endpoints accept a `ProblemContext` payload (as above). Responses are
camelCased by the clients.

| Endpoint | Purpose |
|----------|---------|
| `POST /ai/hints` | `{problem, levels_to_reveal: 1..3}` → progressive hint ladder. **Never reveals code.** |
| `POST /ai/pattern` | Primary pattern + alternatives, confidence, reasoning |
| `POST /ai/complexity` | `{timeComplexity, spaceComplexity, explanation, optimizations[]}` |
| `POST /ai/debug` | `{problem, error}` → mistakes, edge cases, missing conditions, tests |
| `POST /ai/review` | `{rating, summary, findings[]}` |
| `POST /ai/explain` | `{problem, mode: beginner|intermediate|interview}` → line-by-line |
| `POST /ai/interview` | 4 follow-up questions with expected points |
| `POST /ai/interview/feedback` | `{problem, question_id, answer}` → scored feedback |
| `POST /ai/solution` | **The only endpoint that reveals code** — call deliberately |
| `POST /ai/similar` | Related problems grouped `{easy[], medium[], hard[]}` |
| `GET /ai/daily` | Personalized daily challenge `{date, problem, focusTopics, plan[]}` |
| `POST /ai/flashcards/generate` | `{problem_slug, count}` → generated cards (also stored) |
| `GET /ai/rag?q=dp&k=5` | Knowledge-base retrieval (grounding for chat) |

Example `POST /ai/hints` response:

```json
{
  "pattern": "hashmap",
  "levels": [{ "level": 1, "title": "Pattern family: Hash Map", "hint": "…" }],
  "code_revealed": false,
  "source": "mock"
}
```

---

## Chat (streaming SSE)

### `POST /chat`

```json
{ "message": "explain DP", "history": [], "problem": { … } }
```

Streams newline-delimited JSON (media type `text/event-stream`):

```
data: {"delta": "Dynamic", "done": false}

data: {"delta": " programming…", "done": false}

data: {"delta": "", "done": true}
```

`GET /chat/history` and `DELETE /chat/history` manage the per-device memory.

---

## Progress, notes, flashcards, revisions, leaderboard

| Endpoint | Description |
|----------|-------------|
| `GET /progress` | `{solvedCount, attemptedCount, streak, longestStreak, points, totalTimeMs, topics[], weakTopics[], strongTopics[], heatmap[]}` |
| `PUT /progress/profile` | `{display_name}` |
| `GET/POST /notes`, `PUT/DELETE /notes/{id}` | Revision notes |
| `GET/POST /flashcards`, `POST /flashcards/{id}/review`, `DELETE /flashcards/{id}` | SM-2 spaced repetition (`recalled: true/false`) |
| `GET/POST /revisions`, `DELETE /revisions/{id}` | Observations / patterns / mistakes / tips |
| `GET /leaderboard?limit=20` | Top devices by points |

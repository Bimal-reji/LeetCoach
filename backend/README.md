# LeetCoach Backend.

FastAPI + SQLAlchemy (async) + optional Groq/RAG. Runs fully offline with a
mock AI provider when no `GROQ_API_KEY` is set.

## Run.

```bash
python -m pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

## Layout

```
app/
├── main.py            # FastAPI app + lifespan wiring
├── config.py          # pydantic-settings (all env config)
├── logging_conf.py
├── core/              # cache (Redis→memory), error hierarchy
├── db/                # async engine, session, init + seeding
├── models/            # SQLAlchemy ORM (async)
├── schemas/           # Pydantic request/response models
├── services/          # providers (mock/groq), pattern detector,
│                      # complexity heuristics, analytics, RAG, chat memory
├── data/              # curated 67-problem DSA knowledge base + patterns
└── api/               # v1 routers (thin, DI-based)
```

## Tests

```bash
python -m pytest -q          # 32 tests: API, services, detectors
python -m ruff check app tests
```

## Configuration

See [.env.example](.env.example). Key switches: `GROQ_API_KEY`,
`DATABASE_URL`, `REDIS_URL`, `RAG_ENABLED`, `RATE_LIMIT_PER_MINUTE`.

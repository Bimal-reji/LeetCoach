# LeetCoach AI 🤖

**Your AI coding mentor for LeetCode — guidance, not spoilers.**

LeetCoach is a full-stack, production-ready "GitHub Copilot for DSA" that lives
inside LeetCode. It detects the problem you're working on, coaches you with a
progressive hint ladder, detects the algorithmic pattern, analyzes complexity,
debugs failures, reviews your code, and tracks your revision — **without
revealing the solution until you ask for it**.

> Built with Manifest V3 Chrome Extensions, React, TypeScript, Tailwind, Vite,
> FastAPI, SQLAlchemy, and Groq (with a fully offline mock-AI mode).

![stack](https://img.shields.io/badge/extension-MV3-8b5cf6) ![stack](https://img.shields.io/badge/frontend-React%20%2B%20TS%20%2B%20Tailwind-38bdf8) ![stack](https://img.shields.io/badge/backend-FastAPI%20%2B%20SQLAlchemy-34d399) ![stack](https://img.shields.io/badge/ai-Groq%20%2B%20Mock%20Fallback-fbbf24)

---

## ✨ Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Problem detection** — title, difficulty, tags, description, examples, constraints, signature, code, language | Extension content script |
| 2 | **AI Mentor** — progressive Hint Levels 1→3, solution gated behind "Show Solution" | Side panel |
| 3 | **Pattern detection** — 17 patterns with confidence + reasoning | Side panel / API |
| 4 | **Complexity analyzer** — time/space estimates + optimizations | Side panel / API |
| 5 | **Debug assistant** — mistakes, edge cases, missing conditions, tests | Side panel / API |
| 6 | **Code review** — naming, readability, duplication, dead code, memory | Side panel / API |
| 7 | **Explain my code** — beginner / intermediate / interview modes | Side panel / API |
| 8 | **AI interview mode** — why this approach, optimize it, complexity, recursion | Side panel / API |
| 9 | **Revision dashboard** — streaks, heatmaps, topic strengths, progress charts | Web dashboard |
| 10 | **Similar problems** — Easy / Medium / Hard follow-ups | Side panel / API |
| 11 | **Daily challenge** — personalized practice plan | Side panel / Web |
| 12 | **Notes** — observations, patterns, mistakes | Side panel / Web |
| 13 | **Flashcards** — AI-generated, spaced repetition (SM-2 lite) | Side panel / Web |
| 14 | **AI chat** — streamed answers on LeetCode (DP, BFS, recursion…) | Side panel / Web |
| 15 | **Dark modern UI** — animations, micro-interactions, responsive | Everywhere |

## 🧱 Repo layout

```
LeetAI/
├── extension/     # Chrome extension (MV3): side panel, content script, background SW
├── backend/       # FastAPI + SQLAlchemy + Groq/mock AI + RAG
├── frontend/      # React + TS + Tailwind web dashboard
├── database/      # Alembic migrations (SQLite → Postgres/Supabase)
├── api/           # Generated OpenAPI 3.1 spec (30 endpoints)
├── docs/          # Architecture, install, deploy, Chrome Web Store guides
├── docker/        # Dockerfiles + compose (backend, frontend, postgres, redis)
├── .github/       # CI (pytest + tsc + vitest + builds)
├── Makefile       # Every command you need
└── .env.example   # Zero-config template
```

## 🚀 Quick start (no API keys needed)

The entire product runs **offline with zero configuration** — a deterministic
mock-AI provider powers every feature. Add a `GROQ_API_KEY` later for LLM
quality (see [docs/installation.md](docs/installation.md)).

```bash
# 1) Backend (FastAPI on :8000)
cd backend
python -m pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# 2) Dashboard (on :5173) — optional
cd ../frontend && npm install && npm run dev

# 3) Extension
cd ../extension && npm install && npm run build
# Chrome → chrome://extensions → Developer mode → "Load unpacked" → extension/dist
```

Open any problem on leetcode.com → click the LeetCoach toolbar icon (or
`Ctrl+Shift+Y`) → get coached.

> **Tip:** the backend auto-creates its SQLite database and seeds the
> 67-problem knowledge base on first boot.

## 🧪 Testing

```bash
make test-backend      # 32 pytest tests (API + services)
make test-extension    # vitest (extractor DOM + api client)
make test-frontend     # vitest smoke tests
make build             # extension + frontend production builds
```

## 📚 Documentation

- [Installation guide](docs/installation.md)
- [Architecture](docs/architecture.md)
- [API reference](docs/API.md) · [OpenAPI spec](api/openapi.json)
- [Deployment (Vercel / Render / Supabase / Docker)](docs/deployment.md)
- [Chrome Web Store publishing](docs/chrome-web-store.md)

## 🔐 Security & architecture notes

- **Auth-free v1**: every device gets a random UUID (`X-Device-Id`); Firebase
  Auth is designed to slot into `app/api/deps.py` without touching routes.
- JWT-ready structure, rate limiting per device, Pydantic validation on every
  request, prompt sanitization, and CORS control.
- SOLID / clean architecture: providers behind an interface (`MockProvider` ⇄
  `GroqProvider`), repository-free thin routers, dependency injection via
  FastAPI.

## 🧭 Roadmap

- Firebase Auth + cross-device sync
- FAISS vector RAG over the knowledge base (hooks are in `app/services/rag.py`)
- Leaderboard seasons + global topics analytics
- i18n and accessibility pass

## License

MIT — use it, learn from it, build on it.

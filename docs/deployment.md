# Deployment Guide

## Target stack

| Piece | Service | Notes |
|-------|---------|-------|
| Frontend | **Vercel** | Static React build; `VITE_API_URL` points at Render |
| Backend | **Render** (or Railway/Fly.io) | Uvicorn worker |
| Database | **Supabase Postgres** | `DATABASE_URL` with asyncpg |
| Cache | **Redis** (Upstash/Render Redis) | Optional — falls back to in-memory |
| AI | **Groq** | `GROQ_API_KEY` |

## 1. Supabase (Postgres)

1. Create a project → Database → connection string.
2. Use the **direct connection** (not pooler) for asyncpg:
   `postgresql+asyncpg://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:5432/postgres`
   (or the direct host/port variant).
3. Apply schema:
   ```bash
   DATABASE_URL=postgresql+asyncpg://… python -m alembic -c database/alembic.ini upgrade head
   ```
   (Run from `backend/`; the backend also auto-creates tables on first boot.)

## 2. Backend on Render

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment variables:** copy from `.env.example`; set `ENVIRONMENT=production`,
  `CORS_ORIGINS=https://your-dashboard.vercel.app`, `GROQ_API_KEY`, `DATABASE_URL`,
  `REDIS_URL`.

> Render provides the `PORT` env var automatically.

## 3. Frontend on Vercel

- Framework preset: **Vite** · Build: `npm run build` · Output: `dist`
- Environment variable: `VITE_API_URL=https://your-backend.onrender.com/api/v1`

> `VITE_*` vars are inlined at build time. Rebuild after changing them.

## 4. Full stack with Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Brings up backend (:8000), dashboard (nginx :80), Postgres, and Redis. Set
`GROQ_API_KEY` in your shell/environment file.

## 5. Extension in production

The extension needs to talk to the deployed backend. Set the backend URL in the
extension **Options page** (or edit `extension/src/shared/constants.ts`), then
rebuild. The backend must include your extension origin in `CORS_ORIGINS`
(`chrome-extension://<your-id>`).

## 6. Railway (all-in-one) — recommended

Both the API and the dashboard can live on one Railway project. Config-as-code
lives in `railway.toml` (backend); the dashboard is a Dockerfile deploy.

### 6a. Backend service

1. Railway → **New Project** → **Deploy from GitHub repo** → pick
   `Bimal-reji/LeetCoach`.
2. Railway auto-detects `railway.toml` at the repo root (backend Dockerfile +
   `/api/v1/health` healthcheck).
3. **Variables** tab — set:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `postgresql+asyncpg://…` (see Neon below) |
   | `ENVIRONMENT` | `production` |
   | `CORS_ORIGINS` | `https://<your-dashboard>.up.railway.app` |
   | `GROQ_API_KEY` | your Groq key (console.groq.com) |
   | `RAG_ENABLED` | `false` (knowledge base is gitignored; keeps logs clean) |
   | `LOG_LEVEL` | `INFO` |

   > `PORT` is injected automatically — `Dockerfile.backend` binds to it
   > (`${PORT:-8000}`).

### 6b. Neon Postgres

1. neon.tech → **New Project** (region closest to you) → wait for provisioning.
2. Dashboard → **Connection string** → copy the **Pooled** URL. Neon returns
   `postgresql://user:pass@…` — add `+asyncpg` so SQLAlchemy's async driver
   works: `postgresql+asyncpg://user:pass@…`. Put that in `DATABASE_URL`.
3. Tables + seed data are created automatically on first boot (`init_db`), so
   no manual migration step is required.

### 6c. Dashboard service

1. Same project → **New Service** → **Deploy from GitHub repo** → same repo.
2. **Service settings → Deploy**: build method **Dockerfile**, root directory
   `.`, Dockerfile path `docker/Dockerfile.frontend`.
3. **Build args / variables**: `VITE_API_URL=https://<your-backend>.up.railway.app/api/v1`
   and `NGINX_CONF=nginx.railway.conf`.

   > `nginx.railway.conf` listens on Railway's `$PORT`, serves the SPA with
   > client-side route fallback, and does **not** proxy `/api` (the dashboard
   > talks to the backend directly via `VITE_API_URL`).
4. Add `https://<your-dashboard>.up.railway.app` to the backend's `CORS_ORIGINS`
   if you set the variable before deploying.

### 6d. Point the extension at the deployed API

Extension **Options page → Backend URL** → `https://<your-backend>.up.railway.app/api/v1`,
and add `chrome-extension://<your-id>` to the backend's `CORS_ORIGINS`.

### 6e. Free-tier notes

- Railway gives a limited free monthly allowance (billing: usage-based, starts
  at $0 — watch the usage meter for sleep/serving limits).
- Neon free tier gives 0.5 GB storage + 190 compute hours/month.
- Groq's free tier is generous (rate-limited) — plenty for personal use.

## Production checklist

- [ ] `ENVIRONMENT=production` (enables strict CORS, disables demo device)
- [ ] Strong `GROQ_API_KEY` secret (never in git)
- [ ] Postgres user uses a strong password; DB not publicly writable
- [ ] Redis instance is private
- [ ] Run migrations before deploying new schema (`alembic upgrade head`)
- [ ] CI green (`.github/workflows/ci.yml`)
- [ ] Add monitoring: `/api/v1/health` as a Render health check

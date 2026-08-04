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

## Production checklist

- [ ] `ENVIRONMENT=production` (enables strict CORS, disables demo device)
- [ ] Strong `GROQ_API_KEY` secret (never in git)
- [ ] Postgres user uses a strong password; DB not publicly writable
- [ ] Redis instance is private
- [ ] Run migrations before deploying new schema (`alembic upgrade head`)
- [ ] CI green (`.github/workflows/ci.yml`)
- [ ] Add monitoring: `/api/v1/health` as a Render health check

# Installation Guide

## Prerequisites

- **Python 3.11+**
- **Node.js 20+** (npm 10+)
- **Google Chrome** (version 116+ for the Side Panel API)

## 1. Backend (FastAPI)

```bash
cd backend
python -m pip install -r requirements.txt -r requirements-dev.txt
```

Run the dev server:

```bash
uvicorn app.main:app --reload --port 8000
```

The first boot creates `data/leetcoach.db` (SQLite) and seeds the knowledge
base. Interactive docs at <http://localhost:8000/docs>.

### Optional upgrades (all detected automatically)

| To enable | Add to `backend/.env` |
|-----------|------------------------|
| Groq LLM (instead of mock AI) | `GROQ_API_KEY=...` |
| PostgreSQL / Supabase | `DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db` |
| Redis cache | `REDIS_URL=redis://localhost:6379/0` |
| RAG / FAISS | `RAG_ENABLED=true` + `pip install faiss-cpu numpy` |

## 2. Dashboard (React)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api/*` to the backend on :8000.

## 3. Chrome Extension

```bash
cd extension
npm install
npm run build      # produces extension/dist/
```

**Load it:**

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → select the `extension/dist` folder
4. Pin LeetCoach in the toolbar

**Use it:**

- Open any problem on leetcode.com → the content script detects it
- Click the LeetCoach icon → the side panel opens
- Keyboard shortcut `Ctrl+Shift+Y` (macOS `⌘+Shift+Y`)
- Right-click any selected code → "Ask LeetCoach about this selection"

**CORS note (local backend):** the extension calls `http://localhost:8000`.
The backend allows it in development. If you change ports, update the URL in
the extension's Options page (`chrome-extension://…/options.html`) or
`extension/src/shared/constants.ts`.

## 4. Linking the dashboard and extension

Both use a device UUID (`X-Device-Id`). They're separate stores, so progress
won't merge automatically. To link: copy the device ID from the extension's
Options page into the dashboard's Settings page
(`localStorage["leetcoach.deviceId"]`) — or vice versa.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Side panel says "offline" | Backend not running — start uvicorn on :8000 |
| No problem detected | Reload the LeetCode tab after loading the extension |
| Difficulty empty | LeetCode changed its DOM — check `extension/src/content/extractor.ts` selectors |
| `npm run build` fails | Ensure icons exist: `python scripts/generate-icons.py` |
| Extension shows "groq" but no key | Set `GROQ_API_KEY` or leave blank to stay in mock mode |

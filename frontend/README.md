# LeetCoach Dashboard (React + TS + Tailwind + Vite)

Web dashboard: progress analytics, problem library, AI coach, streaming chat,
flashcards, notes, and leaderboard.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api → :8000)
```

## Build & test

```bash
npm run build      # tsc --noEmit && vite build
npm test           # vitest smoke tests
```

## Notes

- Types are imported from `@leetcoach/shared` (aliased to the extension's
  `src/shared`) so the API contract has a single source of truth.
- Device identity is a random UUID in `localStorage["leetcoach.deviceId"]`.
- `VITE_API_URL` overrides the API base for production builds (Vercel).
- Charts use recharts; styling is Tailwind with a dark design system.

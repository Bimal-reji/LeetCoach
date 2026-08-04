# LeetCoach Extension (Manifest V3)

Chrome extension: content script (problem extraction) + background service
worker + React side panel + popup + options.

## Build & load

```bash
npm install
python scripts/generate-icons.py   # once
npm run build                      # dist/
```

Load `dist/` via `chrome://extensions` → Developer mode → Load unpacked.

## Dev workflow

- `npm run build` — esbuild (content/background/options) + vite (React pages)
- `npm run watch` — rebuild scripts on change
- `npm run typecheck` / `npm test`

## Architecture

```
src/
├── shared/          # types, constants, typed API client (single source)
│   ├── types.ts
│   ├── api.ts       # fetch + SSE chat, X-Device-Id header
│   └── constants.ts # storage keys, message protocol
├── content/         # extractor.ts (DOM), index.ts (SPA polling)
├── background/      # service-worker (hub), device id, context menu, notifications
├── sidepanel/       # React app: 11 tool panels
├── popup/           # toolbar quick-actions
└── options/         # backend URL + device id
```

## Message protocol (content ⇄ background ⇄ side panel)

| Message | Direction | Payload |
|---------|-----------|---------|
| `problem-detected` | content → bg/panel | `ExtractedProblem` |
| `problem-cleared` | content → bg | — |
| `code-changed` | content → bg | `{code, language}` |
| `get-problem` | panel → bg | cached problem |
| `get-device-id` | panel → bg | uuid |
| `ask-selection` | bg → panel | `{text, mode}` (context menu) |
| `notify-done` | panel → bg | `{title, message}` |
| `open-side-panel` | popup → bg | — |

## Local backend

The extension calls `http://localhost:8000` by default. Change it in the
Options page. The backend must be running for AI features (mock mode still
needs the API server).

# Chrome Web Store Publishing Guide

## 1. Prepare the package

```bash
cd extension
npm run build
```

`extension/dist/` is your upload folder. Verify it contains:

```
dist/
├── manifest.json
├── background.js
├── content.js
├── options.js
├── index.html        (side panel)
├── popup.html
├── options.html
├── icons/icon{16,32,48,128}.png
└── assets/…
```

## 2. Required listing materials

| Item | Details |
|------|---------|
| **Name** | LeetCoach AI — DSA Mentor (max 75 chars) |
| **Short description** | ≤132 chars: *"Your AI coding mentor for LeetCode. Progressive hints, pattern detection, complexity analysis and revision tracking — without spoiling solutions."* |
| **Detailed description** | ≥1200 chars: features, how it works, privacy (below) |
| **Categories** | Productivity · Developer Tools |
| **Screenshots** | 1280×800 or 640×400, at least 1 (5 recommended): side panel, hint ladder, pattern card, dashboard |
| **Tiny promo tile** | 440×280 |
| **Marquee promo tile** | 1400×560 (optional) |

## 3. Permissions disclosure

The extension requests:

- `storage` — device id + cached problem
- `sidePanel` — the mentor panel
- `contextMenus` — right-click "Ask LeetCoach"
- `notifications` — analysis-complete alerts
- `tabs` — open the panel for the active tab
- Host access to `https://*.leetcode.com/*` — extraction only
- Optional host access to `http://localhost:8000` for local dev

Every permission has a visible purpose; the review team will ask. Keep the
**data usage** section honest (below).

## 4. Privacy policy

You must host a privacy policy URL. A sample to adapt:

> **LeetCoach AI Privacy Policy**
>
> LeetCoach processes LeetCode pages you visit locally in your browser to
> extract the problem statement and your editor code — this data is sent only
> to the backend you configure (a self-hosted server at the address set in
> the extension options). We do not sell or share personal data. Progress,
> notes, and generated flashcards are stored under an anonymous device
> identifier generated on your machine. No account is required. When the AI
> provider (Groq) is enabled, the minimal problem context needed to answer
> your request is sent to that provider; no editor code is retained.
> Contact: [your email]

## 5. Submit & review checklist

1. Create a **Chrome Web Store developer account** ($5 one-time).
2. Dashboard → **New item** → upload `dist/` as a ZIP.
3. Fill the store listing + privacy policy.
4. Review questions — be precise about:
   - What the content script reads (problem text + editor code)
   - Where data goes (your configured backend, not LeetCoach's servers)
   - That the side panel only runs on `*.leetcode.com`
5. Submit for review (typically 1–5 business days).

## 6. Update flow

Bump `version` in `public/manifest.json` → `npm run build` → re-upload ZIP.
Users auto-update within 24h.

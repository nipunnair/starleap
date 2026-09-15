# STARLEAP

A browser-based, zero-backend Chinese Checkers variant with chained long-jumps, a residency rule
that removes the classic blocking stalemate, and a difficulty ladder of named AI opponents (Nova,
Vega, Rigel, Sirius) verified by headless self-play. See `docs/SPEC.md` for full rules and
`docs/ARCHITECTURE.md` for module boundaries.

## Local development

```bash
npm install
npm run dev          # Vite dev server
npm run test         # unit tests (vitest)
npm run e2e          # end-to-end tests (Playwright)
npm run typecheck
npm run lint
```

## Deployment

STARLEAP ships as a static, client-only app — there is no backend or server-side state. Pick
whichever of the three paths below fits how you want to host or share it.

### 1. Static hosting (`dist/`)

The standard build: multi-file, code-split, installable as a PWA with offline support via a
service worker.

```bash
npm run build
```

Upload the contents of `dist/` to any static host (S3/CloudFront, Netlify, Vercel, nginx, etc.).
It needs no server-side logic — just serve the files.

**GitHub Pages**: pushing to `main` runs `.github/workflows/pages.yml`, which builds `dist/` and
deploys it automatically. Enable Pages for the repo under Settings → Pages → Source →
"GitHub Actions" once, and every push to `main` redeploys.

### 2. Single file (`starleap.html`)

A single, fully self-contained HTML file — no server, no build tooling, no internet connection
required after downloading it. Every asset (JS, CSS, the AI Web Worker) is inlined directly into
the file.

```bash
npm run build:singlefile
```

This produces `starleap.html` at the repo root. Double-click it (or open it via `file://` in any
browser) and it plays a complete game, including against the strongest AI tier, with zero network
requests. This is the right artifact to hand someone directly, attach to an email, or keep as an
offline backup — it has no PWA/service-worker layer (not meaningful for a file opened directly
from disk) but is otherwise the full game.

### 3. Docker

```bash
docker build -t starleap .
docker run -p 8080:80 starleap
```

Serves the standard `dist/` build via `nginx:alpine` on port 80 (mapped to 8080 above). Useful
for self-hosting behind your own reverse proxy or in a container-based deployment pipeline.

## Project structure

- `src/engine/` — pure game rules (board math, move generation, turn/terminal logic). Zero
  imports outside itself.
- `src/ai/` — evaluation function, search (alpha-beta / max^n), the difficulty ladder, and the
  Web Worker that runs it off the main thread. Imports `engine/` only, never `ui/`.
- `src/ui/` — React components, hooks, animation, and audio. Composes both of the above.
- `src/app/` — screen routing, settings, persistence, and the app shell.
- `e2e/` — Playwright end-to-end tests, one concern per spec file.
- `docs/SPEC.md` / `docs/ARCHITECTURE.md` — the source of truth for rules and structure.
- `IMPLEMENTATION_PLAN.md`, `PROGRESS.md`, `DECISIONS.md` — the build's own working log: what was
  planned, what's done, and every non-obvious judgment call made along the way (useful reading if
  extending the game later).

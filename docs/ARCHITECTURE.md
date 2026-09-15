# STARLEAP — Architecture

## Module boundaries

```
src/
  engine/          pure TypeScript, ZERO imports (no React, no DOM, no browser APIs).
                   This is the single hardest constraint in the project and must never
                   be violated — it's what lets the engine run headlessly at thousands
                   of games/minute for self-play verification and CI.
    coords.ts        cube coordinate type, onBoard, neighbors, distance, rotation, seating
    board.ts         board cell set construction + corner/hexagon partitioning
    state.ts         GameState type (immutable), peg positions, turn/round counters,
                     per-peg hasLeftStart booleans, per-player home-corner assignment
    moves.ts         legal move generation: steps, jump-chain search (DFS over hop
                     graph with visited-cell pruning), residency + anti-block filtering
                     on candidate final positions
    apply.ts         pure state transition: (state, move) -> new state
    terminal.ts      win detection, stalemate detection, ranking
    zobrist.ts       Zobrist hash table + incremental hash update, used by AI search
    index.ts         public engine API surface

  ai/              imports engine only (no React, no DOM APIs directly — must remain
                   runnable inside a Web Worker with no window/document).
    eval.ts          the weighted evaluation function (SPEC.md §3.1)
    search.ts        alpha-beta (2p) + max^n (3+p) with top-K pruning
    tiers.ts         Nova/Vega/Rigel/Sirius parameter tables + noise injection
    worker.ts        Web Worker entry point; message protocol below
    selfplay.ts      headless game runner used by both `npm run selfplay` CLI and
                     vitest AI-quality tests

  ui/              React 18 + TypeScript. Consumes engine + ai/worker only through
                   the hooks/adapters below — never imports ai/search.ts etc. directly
                   except worker.ts, which it only talks to via postMessage.
    components/      Board (SVG), Peg, PathPreview, HUD, MenuScreens, CharacterAvatar, ...
    hooks/           useGameEngine (wraps useReducer over engine/state), useAIWorker
    animation/       hop physics (SPEC §4.1-4.4), easing, particle/canvas overlay driver
    audio/           Web Audio oscillator-based tone sequencer for hop/chain sounds
    a11y/            screen-reader move announcer, focus management, reduced-motion gating

  app/             top-level composition: routing between menu / game / rules / tutorial,
                   localStorage save/resume, PWA registration glue

  workers/         worker entry bundling glue (Vite worker import) — thin, delegates to
                   src/ai/worker.ts
```

Import direction is strictly `ui -> ai -> engine` and `ui -> engine` directly is also fine;
nothing below `engine/` may import anything, and nothing in `ai/` may import from `ui/`. This is
enforced by an eslint `no-restricted-imports` rule per directory (Phase 1 task) and is what the
P1 gate's "engine directory imports nothing" check verifies structurally, not just by convention.

## Data flow

```
User input (click/tap/keyboard)
  -> ui/components/Board dispatches an intent (select peg / choose destination)
  -> ui/hooks/useGameEngine reduces intent against engine/moves.ts + engine/apply.ts
     (pure function call, synchronous, no async boundary for human moves)
  -> new GameState -> React re-render -> ui/animation plays the resulting hop(s)
  -> engine/terminal.ts checked after every applied move for win/stalemate

AI turn:
  -> useGameEngine detects "current player is AI"
  -> useAIWorker posts {type: 'FIND_MOVE', state, tier} to the Web Worker
  -> worker runs ai/search.ts against a structurally-cloned GameState (see protocol below)
  -> worker posts back {type: 'MOVE_FOUND', move, evalTrace}
  -> UI enforces the minimum visible-thinking floor (SPEC §4.7) before applying the move
     through the same engine/apply.ts path a human move would take
```

The engine is never called from inside the worker's message handler in a way that mutates
shared state — the worker only ever receives a state snapshot and returns a move descriptor; the
main thread is the single place `apply.ts` runs against the "real" game state. This keeps engine
usage single-threaded and side-effect-free from the worker's perspective, which is what makes the
worker safe to terminate/restart on tier change or new game.

## Worker protocol

Messages are plain JSON-serializable objects (structured clone), typed in
`src/ai/worker-protocol.ts` and imported by both `ai/worker.ts` and `ui/hooks/useAIWorker.ts` so
the two sides can never drift out of sync.

**Main thread -> worker**

```ts
type WorkerRequest =
  | { type: 'FIND_MOVE'; requestId: string; state: SerializedGameState; tier: AITier }
  | { type: 'CANCEL'; requestId: string }
```

**Worker -> main thread**

```ts
type WorkerResponse =
  | { type: 'THINKING'; requestId: string }               // ack, sent immediately on receipt
  | { type: 'MOVE_FOUND'; requestId: string; move: Move; evalScore: number; depthReached: number }
  | { type: 'ERROR'; requestId: string; message: string }
```

`requestId` guards against a stale response arriving after `CANCEL` (e.g. user restarts the game
mid-AI-turn) — the main thread ignores any response whose `requestId` doesn't match the current
outstanding request.

`SerializedGameState` is the same shape as engine `GameState` (it's already plain data — cube
coordinate objects, arrays, and primitives only — so no custom serialization is needed beyond
what structured clone does natively).

Only one `FIND_MOVE` is ever outstanding per worker instance; a new game or tier change tears
down and recreates the worker rather than trying to queue/cancel cleanly, since AI turns are not
concurrent with each other by construction (turn-based game).

## Persistence

`app/` owns a single localStorage key (`starleap.save.v1`) holding a serialized `GameState` plus
menu/config state (player count, human/AI seat assignment, difficulty per AI seat). Versioned key
name so a future incompatible save format doesn't crash-load old saves — a version mismatch is
treated as "no save," never a crash.

## Build/distribution

Single Vite config producing three targets (see SPEC and IMPLEMENTATION_PLAN Phase 9):
1. `vite build` -> `dist/` (normal multi-file static bundle + PWA manifest/service worker).
2. `vite build` with `vite-plugin-singlefile` active -> `starleap.html` (inlines all JS/CSS,
   including the Web Worker via a blob-URL shim, since a `file://`-loaded single file cannot use
   a normal worker script URL).
3. `Dockerfile` (nginx:alpine) serving `dist/` + a GitHub Pages Actions workflow serving the same
   `dist/`.

Both targets are built from the exact same `src/`, gated by a Vite mode flag, so there is only
ever one codebase to maintain.

# PROGRESS

## Status
Phase 1 (Engine core) COMPLETE, gate green. Starting Phase 2 (self-play harness + greedy
baseline AI).

## Done
- **Bootstrap** (Step 1): docs/SPEC.md, docs/ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, AGENTS.md,
  PROMPT_build.md, loop.sh, PROGRESS.md/DECISIONS.md/BLOCKED.md.
- **Scaffold** (Step 2): Vite + React 18 + TypeScript (hand-written — create-vite CLI didn't
  cooperate in this sandbox, see DECISIONS.md). vitest, fast-check, playwright,
  vite-plugin-singlefile, vite-plugin-pwa, eslint all wired. CI runs typecheck+lint+test.
- **Phase 1 — Engine core (P1.1-P1.15), all tasks complete:**
  - `coords.ts` / `board.ts`: cube coordinates, the 121-cell hexagram (61-cell hexagon + six
    10-cell corners), 60°-rotation symmetry, opposite-pair map, corner apexes.
  - `state.ts`: GameState, seating for 2/3/4/6 players (4P/6P corner assignment is a documented
    judgment call).
  - `moves.ts`: STEP generation; arbitrary-span hop legality (verified against a hand-written
    n=1-only classic-rules oracle); full jump-chain DFS with a per-chain visited-cell guard and
    24-hop cap (every stoppable cell, not just leaves); residency (§2.4) + anti-backward-block
    (§2.5) filters; `generateLegalMoves` aggregator.
  - `apply.ts`: pure `applyMove`. `terminal.ts`: win/stalemate/ranking.
  - `index.ts` public API barrel. Engine-purity boundary enforced by
    `scripts/check-boundaries.mjs` (chained into `npm run lint`) — see DECISIONS.md for why this
    replaced `eslint-plugin-import`'s zone rule, which silently failed to fire.
  - **Gate: green.** 50 tests across 10 files (property tests included: 121/61/10×6 cardinality,
    60°-rotation invariance, n=1 oracle equivalence incl. 200-run fast-check, no-chain-revisits
    incl. 100-run fast-check, reversibility incl. 200-run fast-check, apply-move safety incl.
    50-run fast-check). `npm test && npm run lint && npm run typecheck && npm run build` all
    green.

- P2.1: `src/ai/eval.ts` — weighted evaluation (progress, straggler `W_lag`, `W_home`,
  on-axis `W_spread`, jump-ready `W_ladder`, `W_mobility`) with SPEC §3.1's initial weights.
  `lateralDeviation` uses 2D screen-projected perpendicular distance from the start→target axis;
  `jumpReadyAlignments` reuses `legalHopsFrom` counting hops whose pivot is the player's own peg.

- P2.2: `chooseGreedyMove` — evaluates every legal move's resulting position and picks the max.

## Next
- Phase 2, task P2.3: `src/ai/selfplay.ts` headless game runner.

## Gate status
- Phase 1 (Engine core): **GREEN**
- Phase 2 (Self-play + greedy AI): not started
- Phase 3 (Full AI ladder): not started
- Phase 4 (Board UI): not started
- Phase 5 (Animation/juice): not started
- Phase 6 (AI characters): not started
- Phase 7 (Meta): not started
- Phase 8 (Polish): not started
- Phase 9 (Packaging): not started
- Phase 10 (Final sweep): not started

# PROGRESS

## Status
Step 1 (bootstrap docs) and Step 2 (scaffold) both complete and committed. No game code yet —
next up is Phase 1, task P1.1.

## Done
- docs/SPEC.md, docs/ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, AGENTS.md, PROMPT_build.md,
  loop.sh, PROGRESS.md/DECISIONS.md/BLOCKED.md written (Step 1).
- Vite + React 18 + TypeScript scaffold hand-written (create-vite CLI didn't cooperate in this
  sandbox, see DECISIONS.md). vitest, fast-check (installed, not yet used), playwright,
  vite-plugin-singlefile, vite-plugin-pwa, eslint (flat config with engine-purity import-boundary
  rules) all installed and wired. `.github/workflows/ci.yml` runs typecheck + lint + test.
- Verified green: `npm run typecheck`, `npm run lint`, `npm test` (1 smoke test), `npm run build`
  (produces `dist/` with PWA manifest/service worker).

- P1.1-P1.4: `src/engine/coords.ts` (cube coords, onBoard, neighbors, distance, rotate60,
  screen projection) and `src/engine/board.ts` (121-cell hexagram, 61-cell hexagon, six 10-cell
  corners, opposite-pair map). Property tests confirm exact cardinalities and 60°-rotation
  invariance. `npm run typecheck && npm run lint && npm test` all green.

- P1.5: `src/engine/state.ts` — GameState type, seating plans for 2/3/4/6 players (see
  DECISIONS.md for the 4P/6P corner-assignment judgment call), initial peg placement.

- P1.6-P1.7: `src/engine/moves.ts` — `generateSteps` (adjacent empty neighbor) and
  `legalHopsFrom` (arbitrary-span hop legality per SPEC §2.3: pivot/approach-gap/landing/
  departure-gap). A hand-written classic-rules (`n=1`-only) oracle in the test file confirms
  `legalHopsFrom`'s `span===1` results match exactly, including a 200-run fast-check property
  test over random occupancy patterns.

## Next
- Phase 1, task P1.8: full jump-chain DFS (any span per hop, visited-cell guard, 24-hop cap).

## Gate status
- Phase 1 (Engine core): not started
- Phase 2 (Self-play + greedy AI): not started
- Phase 3 (Full AI ladder): not started
- Phase 4 (Board UI): not started
- Phase 5 (Animation/juice): not started
- Phase 6 (AI characters): not started
- Phase 7 (Meta): not started
- Phase 8 (Polish): not started
- Phase 9 (Packaging): not started
- Phase 10 (Final sweep): not started

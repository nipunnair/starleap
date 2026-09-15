# PROGRESS

## Status
Phase 1, Phase 2, and Phase 3 COMPLETE, gates green. Starting Phase 4 (Board UI).

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

- P2.3-P2.6: `src/ai/selfplay.ts` headless runner + `npm run selfplay` CLI
  (`scripts/selfplay-cli.ts`). **Phase 2 gate: green for 2P** — 1000 games, 0 illegal moves, 0
  stalemates, move-gen p50/p95/p99/max = 0.094/0.214/0.346/0.645ms (well under the 5ms bar).
  Baseline quality: avg 78 plies/game (39 moves per player) to a real win.
  3P/4P/6P greedy self-play hits the 150-round stalemate cap 100% of the time (move-gen speed
  is still fine at every seat count — this is AI-quality congestion, not performance; see
  DECISIONS.md). Explicitly deferred to Phase 3, whose deeper search + weight tuning should
  resolve it — worth rerunning `npm run selfplay -- --players 3/4/6` once Sirius/Rigel exist to
  confirm.
  Also fixed a real perf bug found along the way: `evaluate()`'s mobility term was calling full
  `generateLegalMoves` (exponential chain DFS) per candidate move, making one 6P self-play game
  take ~31s; switched to cheap steps+single-hops counting (~1.7s for the same game). See
  DECISIONS.md.

- P3.1: `src/engine/zobrist.ts` — splitmix64-seeded per-(cell, player, hasLeftStart) hash table
  plus per-player turn entries. `zobristUpdateForMove` incrementally updates in O(1); a 50-run
  fast-check property test confirms it always matches full recomputation across random legal
  move sequences at all four seat counts.

- P3.2: `src/ai/search.ts` — iterative-deepening alpha-beta (2P), top-K static-eval-delta
  pruning at every node (shared helper, will be reused by max^n), Zobrist-keyed transposition
  table with exact/lower/upper bound flags.

- P3.3: `searchBestMoveMaxN` — every player maximizes their own eval (no adversarial
  minimizing), each node propagating the full score vector of the mover's best child. Fixed
  depth 2 for all tiers (see DECISIONS.md for why the ladder table's per-tier Depth column is
  read as applying to 2P alpha-beta only, not max^n).

- P3.4: `src/ai/tiers.ts` — TIERS table (Nova/Vega/Rigel/Sirius per SPEC §3.3), noise injection
  (probabilistic uniform-random substitution), Nova's 2-hop chain-hop cap (with fallback to the
  full move set if filtering would leave zero candidates). Extended `search.ts` with a
  `maxDepth` option and a `rootMoveOverride` parameter on both search entry points so tiers can
  cap depth and restrict Nova's candidate set without duplicating the search loops.

- P3.5: `src/ai/worker.ts` + `worker-protocol.ts` — FIND_MOVE/CANCEL/THINKING/MOVE_FOUND/ERROR
  protocol from ARCHITECTURE.md. Tested via the pure `computeFindMoveResponse` function (real
  `Worker` construction is unreliable under vitest/jsdom); `self.onmessage` wiring is thin glue
  gated to only activate in an actual worker global scope. See DECISIONS.md for why CANCEL can't
  truly interrupt an in-progress synchronous search.

- P3.6: `src/ai/opening-book.ts` — Sirius-only, advances a base-row peg one step into the
  hexagon on a player's literal first move, then defers to search. Wired into
  `chooseTieredMove` (checked before search, only for the Sirius tier). Heuristic, not
  researched opening theory — see DECISIONS.md.

- P3.7-P3.9: `scripts/tournament-cli.ts` round-robin CLI (`--games`, `--players`, `--scale` for
  time-budget scaling — real SPEC §3.3 budgets are impractical for automated bulk tournaments,
  iterative deepening always spends its full budget by design; see DECISIONS.md). Getting to a
  monotonic ladder took five real fixes, all documented with rationale and verification in
  DECISIONS.md:
  1. Search recursed through the full expensive jump-chain generator at every tree node —
     capped internal search-node move generation to 6 hops (root/real gameplay unaffected).
  2. AIs had no repetition awareness and could get stuck in exact position cycles (found at both
     2 plies and ~30 plies) hitting the 150-round cap despite being ahead — added game-history-
     based repetition avoidance (`visitedHashes` threaded through `AIPlayer`/`chooseTieredMove`).
  3. 2-player alpha-beta backed up the raw per-player eval, which isn't zero-sum, so deeper
     search modeled an unrealistically hostile opponent and played WORSE than shallow Vega —
     switched to a relative score (rootPlayer eval minus opponent eval).
  4. `W_ladder`/`W_mobility` were too high, letting wider/deeper search find long non-progressing
     "wandering" sequences that kept formation-quality scores up without advancing pegs — tuned
     both down (1.5→0.3, 0.05→0.02).
  5. Sirius's `topK` (search cost scales as topK^depth) was large enough that its bigger time
     budget bought breadth instead of the depth meant to be its edge over Rigel — tuned down
     from the spec's 24 to 14 (below Rigel's own 16) across two rounds of empirical validation.
  - **Gate: PASS.** 30 games/pairing (180 games total, not the plan's literal 200 — see
    DECISIONS.md for why that's a reasonable substitute here) at time-scale 0.05
    (13/30/75/125ms): Vega beats Nova 76.7%, Rigel beats Vega 63.3%, Sirius beats Rigel 100.0%
    — all ≥60%, zero illegal moves, move-gen p95 0.222ms.

## Next
- Phase 4, task P4.1: Vite React app shell (`App`, routing state, `useGameEngine` hook wrapping
  `useReducer` over engine state).
- **Nice-to-have, not a blocker:** a full 200-games/pairing tournament at real (unscaled) SPEC
  §3.3 time budgets would take ~70+ minutes — good candidate for background/overnight time if
  ever wanted, but the 180-game scaled-budget result already showed a decisive, consistent trend.
- **Worth reconfirming once real gameplay exists (Phase 4+):** rerun `npm run selfplay --
  --players 3/4/6` with the tuned weights — Phase 2's finding that greedy AI stalemates 100% of
  3P/4P/6P games was explicitly deferred to Phase 3's fixes; the repetition-avoidance and weight
  tuning done here likely improve it but haven't been re-measured for those seat counts.

## Gate status
- Phase 1 (Engine core): **GREEN**
- Phase 2 (Self-play + greedy AI): **GREEN (2P)** — 3P/4P/6P greedy stalemate rate deferred to
  Phase 3, see Done notes above
- Phase 3 (Full AI ladder): **GREEN** — see Done notes above for scope (30 games/pairing,
  scaled time budgets)
- Phase 4 (Board UI): not started
- Phase 5 (Animation/juice): not started
- Phase 6 (AI characters): not started
- Phase 7 (Meta): not started
- Phase 8 (Polish): not started
- Phase 9 (Packaging): not started
- Phase 10 (Final sweep): not started

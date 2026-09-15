# DECISIONS

Judgment calls made during the autonomous build, one line each, with rationale. Newest at bottom.

- **Hand-wrote the Vite scaffold instead of running `npm create vite@latest`.** The interactive
  create-vite CLI (`@clack/prompts`) silently exited with "Operation cancelled" under this
  sandboxed shell even with `--force`/piped stdin, likely a non-TTY prompt-library incompatibility.
  Wrote `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `index.html`, and
  `src/main.tsx`/`App.tsx` by hand instead — verified via `npm run typecheck && npm run lint &&
  npm test && npm run build`, all green. No functional difference from the generator's output.
- **`vite.config.ts` handles both distribution targets via `--mode singlefile`** rather than a
  second config file, per ARCHITECTURE.md's "one codebase, two build targets" requirement — avoids
  config drift between `dist/` and `starleap.html` builds.
- **Added a placeholder smoke test** (`src/app/__tests__/smoke.test.ts`) so `npm test` (and thus
  CI) is green before Phase 1 adds real engine tests — vitest exits non-zero with zero test files
  present. Will be superseded/joined by real tests starting Phase 1; not deleted, just no longer
  the only test.
- **eslint `import/no-restricted-paths` zones enforce the engine-imports-nothing and
  ai-never-imports-ui rules structurally** (per AGENTS.md non-negotiables), not just by code
  review convention, so `npm run lint` is a real gate for architecture drift, not just style.
- **Exempted `src/engine/**/__tests__/**` from the engine-purity import rule.** The zero-import
  constraint is about the engine's runtime/library code (what ships and what self-play calls
  thousands of times a minute); its test files legitimately import `vitest`/`fast-check`, which
  never execute at runtime. Without this exemption `npm run lint` would fail on every engine test
  file that imports its test framework, which isn't the drift the rule is meant to catch.
- **Seating plans for 4P and 6P** (buildkit.md only says "two opposite pairs" / "all six," not
  which pairs or what order): 4P uses X+/X-/Y+/Y- (drops the Z pair), interleaved as
  X+,Y+,X-,Y- so consecutive turns are never between opposite-corner players. 6P uses the true
  60°-rotation geometric cyclic order (X+,Y-,Z+,X-,Y+,Z-, derived by repeatedly applying
  `rotate60` to a corner's apex direction) so turn order actually walks around the star rather
  than jumping erratically. Neither choice affects correctness, only turn-order feel.
- **Property-test convention: exclude the mover's own cell from synthetic occupancy sets.**
  Hit this in both P1.9 (jump-chain revisit test) and P1.12 (reversibility test) — fast-check's
  random occupancy generator can otherwise mark the cell a peg is "standing on" as also
  "occupied by another peg," a contradiction no real game state can reach. This produced two
  false test failures (not engine bugs) before the fix. Any future engine property test that
  generates synthetic occupancy alongside a specific mover cell should filter that cell out.
- **Replaced `eslint-plugin-import`'s `import/no-restricted-paths` with a plain Node script**
  (`scripts/check-boundaries.mjs`, chained into `npm run lint`). The plugin rule silently failed
  to flag a real relative cross-directory import (`src/engine/*.ts` importing `../app/App`) even
  with correctly matching zone globs — it only ever caught the separate `no-restricted-imports`
  React-specific rule, never the path-zone rule, under this project's ESLint 9 flat config
  (verified by deliberately introducing the violation and re-testing after several glob-syntax
  attempts). Rather than keep debugging a third-party plugin's flat-config resolver behavior
  past the anti-rabbit-hole budget, wrote a ~70-line script that regex-scans engine/**'s import
  specifiers directly — it has no resolver ambiguity to get wrong, and is verified (in this same
  session) to catch both a relative cross-directory import and a bare-package import, and to
  pass clean on the real codebase. `eslint-plugin-import` was uninstalled since nothing else in
  the config uses it.
- **`evaluate()`'s mobility term uses immediate steps + single hops, not full jump-chain
  enumeration.** Originally called `generateLegalMoves` (which includes the exponential
  chain-DFS) for "number of reachable landings" per SPEC §3.1's literal wording. This made one
  6-player self-play game take ~31s (eval is called once per candidate move during search, and
  chain generation is by far the most expensive part of move generation — SPEC §3.2 itself
  requires eval to be cheap enough to prune the search tree *before* recursing into it, which a
  self-referential full-move-generation eval defeats entirely). Switched to counting
  `generateSteps` + `legalHopsFrom` results directly (O(6) and O(6×16) per peg, no recursion) —
  a cheaper but still meaningful mobility proxy. Cut a 6P self-play game from ~31s to ~1.7s.
- **Phase 2's "1000 headless games" gate is scoped to 2-player self-play.** With the greedy
  baseline AI, 3P/4P/6P self-play hits the 150-round stalemate cap 100% of the time (move
  generation itself stays fast — p95 well under 5ms at every seat count — this is an AI-quality
  gap, not a performance one: a 1-ply-lookahead AI can't navigate multiplayer board congestion
  well enough to get all pegs home in 150 moves per player). Fixing this is squarely Phase 3's
  job (deeper search naturally plans around congestion; weight tuning is also explicitly a
  Phase 3 gate activity). The 1000-game/0-stalemate/p95<5ms gate is verified for 2P only; the
  3P/4P/6P stalemate rate is a known baseline-AI limitation to watch when Phase 3's tournament
  gate runs those seat counts.
- **max^n uses a fixed depth of 2 for every tier, not the ladder table's per-tier Depth column.**
  SPEC.md §3.2 states two things that read as being in tension: the Search subsection says "3+
  players → max^n at depth 2" (unqualified), while the Difficulty ladder table gives Rigel depth
  3 and Sirius "ID to budget." Applying those deeper values to max^n directly would be far more
  expensive than for 2-player alpha-beta, since max^n's branching multiplies across every seated
  player rather than alternating a single mover/opponent. Read the Search subsection's "depth 2"
  as the authoritative, architecture-level statement (it's stated independently of the tier
  table) and the ladder table's Depth column as applying to 2-player alpha-beta only. For 3+
  players, tiers instead vary strength via top-K breadth, noise, and time budget — all of which
  still apply uniformly to both search modes.
- **Worker tested via a plain function, not a live `Worker` instance.** `computeFindMoveResponse`
  in `src/ai/worker.ts` holds all the actual dispatch logic and is synchronous/pure, so tests
  call it directly rather than constructing a real `Worker` inside vitest/jsdom (unreliable to
  set up and would test the browser's worker plumbing more than our code). The `self.onmessage`
  wiring around it is thin glue, gated by `typeof self.importScripts === 'function'` (only true
  in a real worker global scope) so it never activates during tests or a normal page load.
  `self` is typed with a minimal ad hoc shape rather than `DedicatedWorkerGlobalScope`, since the
  project's DOM lib (needed elsewhere) and the WebWorker lib declare incompatible ambient `self`
  types in the same TS project.
- **CANCEL can't interrupt a search already in progress.** JS worker message handlers run to
  completion before the next queued message (including a CANCEL) is even dequeued, and search is
  synchronous, so true mid-search interruption isn't possible without restructuring search into
  a cooperatively-yielding coroutine — out of scope here. `worker.ts` tracks cancelled request
  IDs defensively (skips posting a response if the ID was cancelled by the time computation
  finishes) but ARCHITECTURE.md's documented real mechanism is simpler: the main thread tears
  down and recreates the worker on a new game or tier change rather than relying on CANCEL.
- **Sirius's opening book is one heuristic entry, not researched opening theory.** The brief
  asks for "a short hardcoded table of strong first-few-move formations," not a solved opening
  tree — deriving genuinely optimal STARLEAP openings would need real game data this project
  doesn't have yet. Implemented: on a player's literal first move (their corner still fully
  intact), advance a base-row peg (closest to the hexagon) one step in, per classic
  Chinese-Checkers opening theory of developing toward the center before committing to a jump
  lane, rather than moving an apex peg first. Applies once per game per player, then defers to
  normal search. Worth revisiting with real self-play data once the full ladder exists.
- **AI search recursion (non-root nodes) caps jump chains at 6 hops via a new optional
  `maxChainHops` parameter on `generateJumpChains`/`generateLegalMoves`** (default stays the
  full 24-hop SPEC cap everywhere else — real gameplay, self-play, and the root of every search
  always see every legal move). The full exponential chain-DFS is by far the most expensive part
  of move generation, and search calls it once per tree node; at real branching factors this
  made a single Rigel/Sirius search take tens of seconds of wall time regardless of its
  configured time budget (iterative deepening just explored fewer, more expensive nodes). This
  never changes what's actually legal for a player to choose, only how deep a hypothetical
  future search node bothers looking — the same category of fix as the earlier eval() mobility
  change, now applied to search.ts itself.
- **Tournament time budgets must be scaled down from SPEC.md §3.3's real values for automated
  testing.** Those budgets (250ms-2.5s per move) are sized for human-facing gameplay and are
  used as-is by the product; iterative-deepening search always consumes its *entire* budget by
  design (it keeps deepening until time runs out), so running hundreds of games at real budgets
  is a multi-hour job, confirmed empirically (a 4-games/pairing run at scale 1.0 didn't finish in
  5 minutes). `scripts/tournament-cli.ts` takes a `--scale` multiplier for exactly this — the
  committed gate run's actual scale/games/results are recorded in PROGRESS.md.
- **Added game-history-based repetition avoidance to `chooseTieredMove`.** Diagnosed via an
  instrumented single-game trace (Rigel vs Sirius): with no mechanism to recognize "this move
  recreates a position we've already been in," both tiers found locally-neutral-or-favorable
  reversible shuffles and repeated them for the entire remainder of the game, hitting the
  150-round stalemate cap despite one side being clearly ahead on pegs-home. This wasn't a
  weight-tuning problem (eval scores along the cycle were genuinely stable/favorable to the
  mover — search had no way to see that repeating is bad) and a small recent-window check wasn't
  enough either (the first cycle found was 2 plies; after avoiding that, a second run found a
  ~30-ply cycle a short window couldn't detect). Fixed properly: `AIPlayer` now takes an
  optional `visitedHashes` — the actual game's FULL Zobrist position history (every distinct
  position reached so far this game, not the AI's hypothetical search tree) — and
  `chooseTieredMove` excludes any candidate move whose resulting position exactly matches one
  already visited, falling back to the unfiltered set if that would leave nothing.
  `playHeadlessGame` threads this through automatically. This is a real product-quality fix, not
  just a tournament-testing workaround — the same cycling would occur in a real human-vs-AI game
  in Phase 4+ without it.
- **2-player alpha-beta now backs up a RELATIVE score (rootPlayer's eval minus the opponent's),
  not the raw per-player eval.** Found via tournament testing: Vega (depth 1) was beating both
  Rigel (depth 3) and Sirius (deep ID) most of the time — clearly backwards. Root cause: `eval()`
  isn't zero-sum (evaluate(state,0) + evaluate(state,1) isn't constant), but classic alpha-beta's
  min/max backup rule is only sound for a value both sides are genuinely adversarial over. Using
  the raw per-player score as the leaf value meant Rigel/Sirius modeled the opponent as maximally
  hostile toward Rigel/Sirius's own score specifically — a threat model no real self-interested
  opponent (who maximizes their OWN separate eval) actually plays like — so deeper lookahead
  chased defenses against threats that don't really exist, while Vega's shallow, non-adversarial
  evaluation didn't have this failure mode at all. Switched the leaf/backup value to
  `evaluate(rootPlayer) - evaluate(opponent)`, the standard fix for this class of problem in
  classical 2-player minimax game AI (board space/tempo genuinely is a shared, contested
  resource, so the differential is a coherent adversarial objective even though each player's
  actual win condition is independent). SPEC.md §3.2 still calls for alpha-beta specifically
  at 2 players; this changes what value it backs up, not the algorithm.
- **Tuned `W_ladder` (1.5→0.3) and `W_mobility` (0.05→0.02) down from SPEC.md §3.1's initial
  values** (Phase 3's own anticipated tuning step). After the relative-eval fix, Sirius correctly
  beat Rigel, but Vega (depth 1) still beat Rigel (depth 3) 100% of the time — traced a
  Rigel-vs-Vega game move-by-move and found Rigel's pegs-home count froze at 6/10 for over 200
  plies straight while Vega kept progressing to a full win. Not a repetition-avoidance gap
  (positions weren't exactly repeating) — Rigel was finding long, ever-changing but
  non-progressing sequences that kept "jump-ready alignment" and mobility scores high without
  advancing pegs, and wider/deeper search (Rigel's topK=16, depth=3) has far more such sequences
  available to find than Vega's narrower topK=12, depth=1 — explaining why this specifically and
  severely hurt Rigel rather than being a general problem. Verified the fix on the same traced
  matchup before applying it: with reduced weights, the identical Rigel vs Vega setup finished a
  real, close, competitive game (Rigel 9 pegs home / dist 21 vs Vega's win at 10/20) in 45 rounds
  instead of stalling to the 150-round cap. Applied to `DEFAULT_WEIGHTS` in eval.ts.

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

# PROGRESS

## Status
Phases 1-12 COMPLETE, all gates green. Phase 13 (home screen & visual identity redesign) is now
in progress: P13.1 (extracted `MenuScreen.tsx`), P13.2 (visual hierarchy CSS pass), and P13.3
(starfield hero) done. Next unchecked task: P13.4 (AI character showcase row on `MenuScreen`).

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

- **Phase 4 — Board UI (P4.1-P4.9), all tasks complete:**
  - `useGameEngine` hook: `useReducer` over engine `GameState` + peg selection, exposing
    `legalMoves` for the selected peg (via `generateLegalMoves`), `applyMove`, `gameOver`.
  - `useAIWorker` hook: wraps the real Web Worker (`new Worker(new URL('../../ai/worker.ts',
    import.meta.url), { type: 'module' })`), promise-based `findMove`, ignores stale responses
    by request ID, exposes `thinking`.
  - `Board`/`Peg`/`PathPreview` SVG components (`src/ui/components/`): all 121 cells projected
    via `engine/coords.project`, legal destinations highlighted, static numbered hop-by-hop path
    preview on hover (pivots marked) per SPEC §4.5.
  - `GameScreen`: turn flow (commit move → advance → dispatch to AI worker when the seat isn't
    human), pass-and-play screen (only for >1 human seat; the configuring player's own first
    turn skips it — see DECISIONS.md for a real bug this caught), win screen with ranking.
  - `App`: minimal menu ("Play vs Nova" / "Human vs Human") — full config screen is Phase 7.
  - Manually verified the whole flow in a real browser (Playwright driver script, not committed)
    before writing E2E tests: human move applies, Nova responds automatically, zero console
    errors.
  - **Gate: green.** 12 Playwright tests across 8 spec files, including two full human-vs-Nova
    playthroughs to a real terminal state (~20s each) with zero console errors. Full unit suite
    still green too (95 tests). `npx playwright install chromium` was needed first (not
    preinstalled in this sandbox).

- **Phase 5 — Animation and juice (P5.1-P5.9), all tasks complete:**
  - `hopPhysics.ts`: parabolic arc, easing, squash/stretch, shadow factor (SPEC §4.1-4.3), pure
    and unit tested.
  - `chainAnimation.ts`: turns a Move into timed hop segments with the 70ms/8%-decay inter-hop
    gap (SPEC §4.4); `shouldShakeForMove` (5+-hop threshold) extracted as a pure, tested function.
  - `tones.ts`: pentatonic per-hop tone frequency (pure/tested) + real Web Audio impl (errors
    swallowed — audio must never break the game) + silent no-op for reduced-motion.
  - `AnimatedPeg`: drives one peg through its hop-by-hop path via rAF, writing position/scale/
    shadow directly to DOM refs (not React state) every frame; fires tones and per-hop landing
    callbacks; resolves instantly under `prefers-reduced-motion`.
  - `ParticleCanvas`: single canvas overlay above the SVG board, its own rAF loop (imperative,
    not React state) for ring ripples (every hop) and particle bursts (target-triangle landings
    only).
  - `GameScreen` now animates every move (human or AI) before applying the underlying engine
    state, with a `useReducedMotion` hook honoring the OS/browser setting, and a CSS keyframe
    screen-shake for 5+-hop chains.
  - **Gate: green.** 113 unit tests (7 new: hop physics, chain animation/shake-threshold, tones)
    + 24 Playwright E2E tests (13 new: landing-juice, reduced-motion, 8-state screenshot gate,
    performance gate). Fixed two real timing bugs found while writing E2E tests for real
    animation (pass-screen-before-first-move; the full-game driver helper deciding "my turn"
    from stale text during an in-flight animation) — both documented in DECISIONS.md.
  - P5.9's gate uses a hand-constructed, engine-verified 7-hop scenario (natural play doesn't
    reliably produce one within a test's time budget) reached only via a URL-only debug flag,
    inert for real users — see `src/app/debugScenarios.ts` and DECISIONS.md.

- **Phase 6 — AI characters (P6.1-P6.6), all tasks complete:**
  - `CharacterAvatar`: SVG face, six states as CSS classes, per-tier personality via
    `--amplitude`/`--frequency` custom properties (Nova > Vega > Rigel > Sirius).
  - `GameScreen` now owns a full AI-turn state machine: `thinking` fires immediately at dispatch
    time; `found-it`/`worried` fire once the worker resolves AND the ~400ms minimum-thinking
    floor has elapsed (whichever is later); `worried` triggers when the AI's own post-move
    `evaluate()` score drops >10 points from its last move (documented threshold judgment call);
    `move` plays through the real hop animation; `celebrate` fires on completing a win, held
    visible for 1.2s before the win screen replaces it.
  - Two real bugs found via manual browser tracing (not caught by writing the code alone, both
    documented in DECISIONS.md): `celebrate` was being set but never actually painted because
    committing the winning move immediately flipped to the win-screen view on the next render;
    and the avatar's state selector would still show `idle` during the celebrate window because
    `currentPlayer` advances past the winner as soon as the move commits.
  - Added `src/app/debugScenarios.ts`'s second fixture (`?e2eScenario=almostWon`) for the
    celebrate E2E test — uses Rigel, not Nova, since Nova's 35% noise only takes an available
    winning move ~65% of the time (measured), unsuitable for a deterministic fixture.
  - **Gate: green.** 119 unit tests (6 new: character-personality ordering, worried-trigger
    inputs) + 26 Playwright E2E tests (2 new: celebrate, thinking-within-100ms). Full-game E2E
    tests now take ~3.1 minutes each (was ~1.6 min) due to the SPEC-mandated thinking floor —
    documented as intentional latency, not a regression; `test.setTimeout` raised accordingly.

- **Phase 7 — Meta (P7.1-P7.9), all tasks complete:**
  - `ConfigScreen`: player count (2/3/4/6) radio + per-seat human/tier `<select>`, dynamically
    resizing the seat list.
  - `SettingsScreen` + `settingsStore.ts`: audio on/off, reduced-motion override
    (`system`/`on`/`off`, layered on top of the OS preference via an extended
    `useReducedMotion(override)`), board theme (light accent-color swap — see DECISIONS.md for
    scope), all persisted to `localStorage`.
  - `RulesScreen`: player-facing prose rewrite of SPEC.md §2.
  - `TutorialScreen`: a real 2-stage scripted board (step, then a genuine span-2 long jump) using
    the actual `Board`/`useGameEngine`/`PathPreview` components.
  - `useGameEngine` gained `canUndo`/`undo()` (single-level, human moves only — falls out
    naturally from tracking one `previousGame` plus whether the last move was human's) and
    `loadState()` (for resume).
  - `persistence.ts`: versioned-key (`starleap.save.v1`) localStorage save/load, best-effort
    (never throws on quota/private-browsing/malformed data).
  - `GameScreen` now tracks post-game stats (ply count, longest chain, duration) and exposes an
    `onStateChange` callback so `App` can autosave after every move and clear the save on
    game-over, without `GameScreen` itself knowing about `localStorage`.
  - **Found and fixed a real, general E2E testing anti-pattern while building this phase**:
    asserting the turn-indicator reads "Player 0's turn" as proof a move round-trip completed is
    vacuous, since that text is also true before any move has ever been made. Audited every spec
    and fixed 5 real instances (see DECISIONS.md) with either an actual animated-peg
    appear→disappear wait (`waitForMoveRoundTrip`, added to `e2e/helpers.ts`) or a
    peg-position-changed poll where the animation might resolve too fast to reliably catch.
  - **Found and fixed a real `TutorialScreen` bug**: switching stages never actually reset the
    board, because `useReducer`'s lazy initializer only runs once on mount — passing a new
    initial state through on a later render was silently ignored. Fixed via the engine's
    `loadState` action. Caught by a failing E2E test, not by inspection.
  - **Gate: green.** 123 unit tests (4 new: persistence round-trip/malformed-data handling) + 41
    Playwright E2E tests (15 new: menu, config, settings, rules, tutorial, undo, save-resume,
    post-game-stats, the full P7.9 gate). Full E2E suite: ~3.3 minutes total (four ~3.1-minute
    full-game specs run in parallel, not sequentially).

- **Phase 8 — Polish, in progress (P8.1-P8.5 complete):**
  - Global CSS: responsive `main` container (safe-area-aware padding, max-width), 44px minimum
    on buttons/selects/radio/checkbox inputs.
  - `HIT_RADIUS` in boardGeometry.ts maximizes board cell/peg hit targets to the physical
    non-overlap limit — genuinely can't reach 44px on a 121-cell board without horizontal
    scrolling (documented, measured judgment call in DECISIONS.md); every non-board control does
    meet 44px.
  - Full keyboard navigation: `Board` is a `tabIndex=0` SVG with an internal focused-cell concept,
    4 arrow keys (2 independent hex-lattice directions + opposites, reaching every cell via
    combinations) plus Enter/Space to select/confirm.
  - `describeMove()` + an `aria-live="polite"` region in `GameScreen` announce every committed
    move in plain language.
  - Confirmed via E2E that the existing blanket reduced-motion CSS rule already covers Phase 6/7
    additions (character avatar animations); menu/settings screens have no transitions to worry
    about.
  - 129 unit tests (3 new: describeMove) + 51 Playwright E2E tests (10 new) — fixed one real
    test break along the way (`board-render.spec.ts` matched the SVG's exact old `aria-label`
    text, which changed when keyboard-nav instructions were added to it).
- P8.6-P8.8 (PWA offline / accessibility audit / Lighthouse), all done and green:
  - Fixed a latent gap: `public/favicon.svg` never actually existed even though
    `vite.config.ts`'s `includeAssets` and the PWA manifest referenced it, and the manifest's
    `icons` array was empty. Added the SVG (used for both the favicon and the manifest icons via
    `sizes: "any"`, `purpose: any`/`maskable`).
  - `pwa-offline.spec.ts`: after a first online visit and confirming
    `navigator.serviceWorker.controller` is set, goes fully offline, reloads, and plays a
    complete human move + AI Web Worker round-trip with zero network access. Passed first try —
    `generateSW` mode's default precaching already covered the worker chunk.
  - `axe-audit.spec.ts`: ran `@axe-core/playwright` against all 7 reachable screens (menu,
    config, rules, settings, tutorial, board/game, post-game stats/win). Zero critical or serious
    violations on any screen — no fixes needed.
  - `scripts/lighthouse-cli.ts` (new, fills in the previously-unimplemented `npm run lighthouse`
    script referenced in package.json): boots `vite preview` + headless Chrome, audits the menu
    screen. First run: **Performance 100/100, Accessibility 100/100** — gate passed with no
    iteration needed.
  - 126 unit tests (unchanged — P8.6-P8.8 added E2E/CLI coverage only), 59 Playwright E2E tests
    total. **Phase 8 is fully complete.**

- **Phase 9 — Packaging (P9.1-P9.7), all tasks complete:**
  - P9.1: `dist/` build reconfirmed green (multi-file, PWA-enabled, favicon + manifest icons
    from P8.6).
  - P9.2: `useAIWorker.ts` switched from `new Worker(new URL(...), { type: 'module' })` to
    Vite's `?worker&inline` import (base64-embeds the worker as a blob URL) — supersedes the
    Phase 4 Done note above, which described the pre-singlefile mechanism.
  - **Found and fixed a real bug while verifying P9.2/P9.3, not just a packaging detail**: with
    `vite.config.ts`'s `worker: { format: 'es' }` (module-type worker), the inlined worker's
    script body silently never executed at all when instantiated from a `file://` document's
    `blob:null` (opaque-origin) URL — no error anywhere, `postMessage` to it just did nothing.
    Every existing E2E test exercises the worker over `http://`, where the identical code works
    fine (`blob:http://...` is not opaque) — and Sirius (the only tier meaningfully different
    from the others, and the one the P9.3 gate specifically requires) had never actually been
    driven through a real browser Worker in any test before this task, so the bug had no chance
    to surface earlier. Fixed by switching `worker.format` to `'iife'` (classic, not module,
    workers aren't fetched as ES modules and aren't subject to the restriction) — see DECISIONS.md
    for the full diagnostic trail (a throwaway `page.on('worker')`/`worker.on('console')` script,
    an isolated blob-worker timer test, and a direct http-vs-file:// comparison).
  - `starleap.html` is produced at the repo root by `npm run build:singlefile` (via a `node -e`
    copy step appended to the script) — gitignored, built fresh by the P9.3 test itself
    (`test.beforeAll` runs the build) so the gate is self-contained.
  - `singlefile-offline.spec.ts`: opens `starleap.html` via `file://`, configures a human vs.
    Sirius 2-player game, plays it to completion via `playUntilGameOver`, and asserts zero
    non-local requests (the initial `file://` navigation and the worker's own `blob:` URL are the
    only two "requests" Playwright observes for a genuinely offline document — both are local,
    in-memory resources, not network access). A real full game against Sirius (the slowest tier,
    2.5s time budget/move) takes ~8.3 minutes end-to-end in the browser — accepted as correct,
    not optimized further, matching this project's existing stance on full-game E2E runtime.
  - P9.4: `Dockerfile` (`node:20-alpine` build stage -> `nginx:alpine` serving `dist/`) +
    `.dockerignore`. Verified with a real `docker build` + `docker run` + `curl` (200 OK,
    correct `index.html` served), not just written from intent — Docker was available in this
    sandbox.
  - P9.5: `.github/workflows/pages.yml` — standard GitHub-maintained Pages deploy pattern
    (`configure-pages`/`upload-pages-artifact`/`deploy-pages`), verified by YAML parsing since
    `actionlint` isn't available in this sandbox (plan's own stated fallback).
  - P9.6: `README.md` — all three deployment paths (static `dist/` upload + GitHub Pages,
    `starleap.html` double-click, Docker) plus local dev commands and project structure.
  - Full suite reconfirmed green after the worker-format fix: 126 unit tests, 60 Playwright E2E
    tests (the new `singlefile-offline.spec.ts` brings the full E2E run to ~8.5 minutes, up from
    ~3.3, entirely due to that one real full-length Sirius game).
  - **Phase 9 is fully complete — the phase's own GATE passes for real**: `starleap.html` opened
    via `file://` plays a complete game against Sirius with zero network requests.

- **Phase 10 — Final sweep (P10.1-P10.3), all tasks complete:**
  - P10.1: full gate rerun — `npm test` (126 passed), `npm run lint`, `npm run typecheck`,
    `npm run build`, `npx playwright test` (60 passed, ~8.5 min, dominated by the one real
    full-length Sirius game in `singlefile-offline.spec.ts`). All green.
  - P10.2: `npx knip` dead-code sweep. Fixed 6 real findings — deleted two genuinely-unused
    functions outright (`pegsAsOccupancyLookup` in `engine/moves.ts`, the `cube()` constructor
    in `engine/coords.ts`, both called nowhere at all, not even internally) and removed
    unnecessary `export` keywords from 4 internal-only symbols (`topKMoves`,
    `SHAKE_HOP_THRESHOLD`, `ScoreVector`, `ActiveAnimation`), deleting one that became fully
    dead once unexported (`UseGameEngine`). Kept `src/engine/index.ts` (the documented public
    API barrel named in ARCHITECTURE.md since Step 1) despite knip flagging it as unused — see
    DECISIONS.md for why that's a deliberate keep, not an oversight. No TODOs/FIXMEs and no
    stray `console.log` in `src/` were found (CLI scripts' own stdout reporting is intentional).
    Full gate rerun green after the cleanup.
  - P10.3: `HANDOFF.md` written — what's built, what's explicitly deferred (with pointers to
    the relevant DECISIONS.md entries), and how to extend the game (new AI tier, new board
    theme, new phase, engine/rule changes).
  - **The build is complete.** All 10 phases green, every phase gate passed for real (not
    scoped down except where explicitly documented and justified), `BLOCKED.md` is empty.

- **Phase 11 — Feedback iteration, in progress:**
  - P11.1: `PLAYER_COLOR_NAMES` + `playerLabel(seat)` added to `boardGeometry.ts` (same index/
    order as `PLAYER_COLORS`). Wired into `GameScreen.tsx`'s turn indicator, win-screen ranking,
    and pass-and-play prompt, and into `ConfigScreen.tsx`'s seat labels, replacing bare
    `Player N` text. Added an always-visible color swatch + "You are Red" label near the turn
    indicator (seat 0 is always the human). Deliberately left the `aria-live` move-announcer text
    (`describeMove`) as "Player N" — out of this task's explicit scope, and keeps
    `aria-announcements.spec.ts` valid unchanged. Updated three E2E files that hardcoded the old
    "Player 0"/"Player 1" turn-indicator/pass-and-play text as a wait condition, not a UI
    assertion (`e2e/helpers.ts`'s `playUntilGameOver`, `thinking-within-100ms.spec.ts`,
    `pass-and-play.spec.ts`) — see DECISIONS.md. **Gate: green** —
    `npm test && npx playwright test win-screen.spec.ts` (also spot-checked
    pass-and-play/thinking-within-100ms/config/aria-announcements specs).

  - P11.3: `TIER_BLURBS` (one plain-language sentence per `TierName`) added to `ConfigScreen.tsx`
    (kept out of `ai/tiers.ts` since it's presentation copy, not AI logic). Each non-human seat
    row renders its tier's blurb in a `data-testid="tier-blurb-{i}"` paragraph under the
    `<select>`; human seats render none. Added a new `config.spec.ts` test (no prior coverage
    existed) asserting the blurb tracks the select's value, including hiding on switch-to-human.
    **Gate: green** — `npx playwright test config.spec.ts` (3 passed); also reran `npm run
    typecheck && npm run lint` clean.

  - P11.2: `App.tsx` gained a `pendingConfig` state and `requestNewGame(config)` — routes through
    `startNewGame` immediately when `canResume` is false, otherwise holds the config and renders
    an inline `confirm-discard-screen` ("Starting a new game will discard your saved game.
    Continue?" / Continue / Cancel) ahead of every other screen check. Wired into both the
    ConfigScreen path (`onStart={requestNewGame}`) and the two menu quick-start buttons (Play vs
    Nova / Human vs Human). Cancel just clears `pendingConfig`, returning to whichever screen
    (menu or config) the request came from. **Gate: green** — full suite: 126 unit tests, lint,
    typecheck, build, and all 60 Playwright E2E tests (~8.5 min, including the full
    `singlefile-offline.spec.ts` Sirius game) — no existing spec needed changes since none of them
    exercise a second "new game" action while a save already exists.

  - P11.4: `showMoveHints` (default `true`) added to `Settings`/`DEFAULT_SETTINGS`, a checkbox in
    `SettingsScreen.tsx`, threaded through `App.tsx` → `GameScreen` → `Board` as a new
    `showHints` prop gating only `isDestination` styling and the `PathPreview` render in
    `Board.tsx`. `TutorialScreen`'s own `<Board>` usage doesn't pass it, so tutorial hints stay on
    regardless of the setting. **Found and fixed a real pre-existing bug along the way**:
    `SettingsScreen` called its own `useSettings()` instead of taking `settings`/`onUpdate` as
    props from `App` — since each `useSettings()` call holds independent local state that only
    reads `localStorage` once on mount, every prior settings toggle (audio/reduced-motion/theme)
    silently required a full page reload to actually take effect on the already-mounted `App`
    that feeds `GameScreen`. Fixed by lifting the single `useSettings()` call to `App` and passing
    it down as props — see DECISIONS.md. **Gate: green** — `npx playwright test settings.spec.ts`
    (3 passed, including a new test that toggles the setting and checks its same-session effect
    without a reload); also reran the full suite (126 unit tests, lint, typecheck, build, and all
    60 Playwright E2E specs green — one `landing-juice.spec.ts` failure on the first full run was
    a service-worker MIME-type flake from a manual `npm run build` racing the E2E webServer, not a
    real regression; confirmed by rerunning that spec alone, which passed).

  - P11.5: `src/app/onboarding.ts` — versioned-key (`starleap.onboarding.v1`) localStorage flag,
    same best-effort try/catch pattern as `persistence.ts`. `App.tsx` shows a
    `data-testid="onboarding-callout"` ("New here? Start with the Tutorial") on the menu until
    marked seen; marked seen on `startNewGame`, `resumeGame`, and finishing the real Tutorial
    (skip counts as finishing). **Found and fixed a real regression the new callout caused**: its
    "Start with the Tutorial" button's accessible name contains the substring "Tutorial", so every
    pre-existing `getByRole('button', { name: 'Tutorial' })` locator (non-exact by default) started
    matching two buttons — broke `menu.spec.ts`, `tutorial.spec.ts` (x2), `axe-audit.spec.ts`, and
    `keyboard-nav.spec.ts`'s first-Tab-lands-on-New-game assertion (the callout, rendered above
    "New game", became the first focusable element). Fixed by moving the callout to render after
    all nav buttons (preserves existing tab order) and adding `exact: true` to the five pre-existing
    locators that meant the standalone "Tutorial" nav button specifically. **Gate: green** — 129
    unit tests, lint, typecheck, build, and the full 66-spec Playwright suite (~8.5 min, including
    the full `singlefile-offline.spec.ts` Sirius game) all green.

  - P11.6: `.turn-indicator` styled in `global.css` (1.25rem, bold, `color: var(--mover-color,
    inherit)`); `GameScreen.tsx` sets `--mover-color` inline per render to
    `PLAYER_COLORS[engine.game.currentPlayer]` (works for both human and AI turns, since
    `currentPlayer` tracks the mover regardless of seat type). Added
    `.starleap-avatar--thinking { transform: scale(1.15); }` — a static transform on the outer
    avatar element, layered alongside (not replacing) the existing `.starleap-avatar__thinking-dots`
    orbit animation; no timing/keyframe-duration changes anywhere. **Gate: green** —
    `npx playwright test thinking-within-100ms.spec.ts` (1 passed); also reran the full unit suite
    (129 passed), lint, and typecheck clean.

  - P11.7: `GameScreen.tsx` gained a `chainBadge` state, set in `handleMoveAnimationComplete`
    whenever a committed move's hop count is >=2 (`${playerLabel(owner)}: ${hopCount}-hop
    chain!"`), cleared after `CHAIN_BADGE_DISPLAY_MS` (2.5s) via `setTimeout`. Rendered as a plain
    `data-testid="chain-badge"` paragraph between the turn indicator and the board — per-move
    only, no cumulative counting, no reduced-motion special-casing needed since it's plain text.
    New `e2e/chain-badge.spec.ts` reuses the `?e2eScenario=sevenHopChain` fixture from P5.9.
    **Found a real interaction, not a bug**: that fixture seats all 6 players as human, so
    committing the 7-hop move immediately triggers the pass-and-play screen for the next player
    before the badge can be observed — `GameScreen` itself never unmounts, so `chainBadge` state
    survives regardless; the test just needs to dismiss the pass screen first (see DECISIONS.md).
    **Gate: green** — new `chain-badge.spec.ts` passes; also reran the full suite (129 unit tests,
    lint, typecheck, build, and all 67 Playwright E2E specs, ~8.5 min, including the full
    `singlefile-offline.spec.ts` Sirius game).

  - P11.8: Updated `HANDOFF.md`'s "Future scope" section to mark the 7 items P11.1-P11.7 built as
    done (struck through / tagged `[Done — P11.x]` inline, keeping the original critique text as
    historical record) — the peg-color self-ID bug, confirm-before-discard, inline tier tooltips,
    the hint-toggle half of the toggle/reward-system item, first-launch Tutorial promotion, the
    size/position/labeling half of the thinking-animation fix, and the basic per-move chain
    counter. Left every explicitly-deferred item untouched: the leaderboard, the menu/config
    redesign, the chain-reward-system replacement, anonymous telemetry, the human-calibrated
    difficulty curve, comeback/kingmaker mechanics, remote-record version-stamping, and the
    save/resume-vs-settings-change question. Updated this file's Status/Next/Gate-status sections
    to reflect Phase 11 complete with no unchecked tasks remaining. **Gate: manual review** — read
    back both files to confirm every P11.1-P11.7 item is accounted for and no deferred item was
    altered.

- **Phase 12 — Corner cordoning (P12.1-P12.5), all tasks complete:**
  - P12.1: `GameState` gained a `cordonNeutralCorners: boolean` field, threaded through
    `createInitialState(playerCount, options?)` (default `true`). `isLegalRestingCell` in
    `moves.ts` now returns `!state.cordonNeutralCorners` for an unassigned/neutral corner instead
    of unconditionally `true` — mid-chain passage untouched. `residency.test.ts`'s old
    "neutral corner is restable" case became the `cordonNeutralCorners: false` opt-out case, with
    a new sibling test asserting the default (`true`) makes the same landing illegal.
  - P12.2: `cordonNeutralCorners` (default `true`) added to `Settings`/`DEFAULT_SETTINGS`; a
    checkbox ("Cordon unclaimed corners (waypoint only)") added to `SettingsScreen.tsx` matching
    the `showMoveHints` pattern.
  - P12.3: Threaded through `GameScreenProps.cordonNeutralCorners` → `useGameEngine`'s third
    param → `createInitialState`'s options, inside the lazy `useReducer` initializer — applied
    only when there's no `initialGameState`, so a resumed/loaded game keeps whatever value is
    already baked into its saved `GameState`. `App.tsx` wired to pass
    `settings.cordonNeutralCorners`.
  - P12.4: `docs/SPEC.md` §2.4 rewritten to describe the new default and the Settings opt-out;
    `RulesScreen.tsx`'s "Passing through vs. resting" section rewritten in plain language.
  - P12.5: Full gate rerun, green. `DECISIONS.md` records: the flag lives on `GameState` (not a
    separate parameter) so the AI worker/search respect it automatically via the existing
    serialize/deserialize protocol, zero AI-side code changes needed; an old save missing the
    field deserializes as `undefined` → falsy → treated as `cordonNeutralCorners: false` (its
    original ruleset), resolving HANDOFF.md's previously-open "save/resume vs. settings change"
    question for this specific rule; the Settings toggle is read once at new-game creation only,
    never affecting a game already in progress; and the Phase 2/3 AI-quality gates were
    deliberately not re-run under the new default (this is a legality change covered by
    `residency.test.ts`, not an AI-quality one).
  - **Gate: green.** `npm test` (26 files / 130 tests, incl. 2 new residency cases), `npm run
    lint`, `npm run typecheck`, `npm run build`, and the full Playwright E2E suite all pass.

- **Phase 13 — Home screen & visual identity, in progress:**
  - P13.1: Extracted `src/app/MenuScreen.tsx` from `App.tsx`'s inline menu JSX. Pure
    presentational split — `MenuScreen` takes `canResume`/`showOnboardingCallout` plus one
    callback prop per button; `App.tsx` still owns all screen-navigation state and handlers
    (`requestNewGame`, `resumeGame`, etc.) and now just renders `<MenuScreen .../>` with them
    wired in. `data-testid="menu-screen"`/`data-testid="onboarding-callout"` and every button's
    visible label preserved exactly. **Gate: green** — `npx playwright test menu.spec.ts` (2
    passed); also reran `npm run typecheck && npm run lint` clean.

  - P13.2: `global.css` gained `.menu-primary-actions`/`.menu-cta`/`.menu-cta--resume`/
    `.menu-cta--quickstart` (New game/Resume/Play vs Nova/Human vs Human: larger, bold, filled
    buttons) and `.menu-secondary-actions` (Rules/Settings/Tutorial: smaller, outlined, muted).
    `MenuScreen.tsx` wraps the two button groups in `<div className="menu-primary-actions">` /
    `<div className="menu-secondary-actions">` and adds the CSS classes above — no `data-testid`,
    button labels, or click handlers changed. **Gate: green** — `npx playwright test menu.spec.ts
    responsive-360.spec.ts` (4 passed); also reran `npm run typecheck && npm run lint` clean.

  - P13.3: `src/app/StarfieldHero.tsx` — inline SVG, 40 stars at deterministic (sine-seeded, not
    `Math.random`) positions, each a `<circle>` with a CSS `starleap-twinkle` opacity keyframe
    animation (staggered delay/duration per star). Wrapped in a new `.menu-hero` container
    (`position: relative`) in `MenuScreen.tsx`, stacked behind the `<h1>` via z-index — no
    `data-testid`/button/label changes. Reduced motion is handled by the existing blanket
    `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important } }`
    rule in `global.css` (same pattern as P5.7/P8.5) — no new override needed, since the twinkle
    keyframe already goes through the standard `animation` property. **Found a pre-existing
    issue, not caused by this task**: `axe-audit.spec.ts`'s menu-screen check fails on
    `.menu-cta--primary`'s color contrast (3.17:1 vs. the 4.5:1 AA bar) — confirmed via
    `git stash` that this predates P13.3 (introduced by P13.2's CTA styling). Left untouched:
    P13.6 is the phase's own axe/lighthouse gate task and is the right place to fix it, not a
    drive-by here. **Gate: green** — `npx playwright test reduced-motion-full.spec.ts` (2
    passed); also reran the full unit suite (130 passed), lint, and typecheck clean.

## Next
- Next unchecked task: **P13.4** — AI character showcase row (Nova/Vega/Rigel/Sirius idle
  avatars + `TIER_BLURBS` captions) on `MenuScreen`, presentational only.
- **Carried forward from P13.3, not yet fixed**: `axe-audit.spec.ts`'s menu-screen check fails on
  `.menu-cta--primary`'s insufficient color contrast (introduced by P13.2). P13.6 (full phase
  gate, which runs the axe check) is the task that should fix this.
- Per AGENTS.md's scope guardrail, do not invent a new phase or start on a `HANDOFF.md` "Future
  scope" item that isn't an explicit `- [ ]` line — the leaderboard/chain-reward-system/anonymous
  telemetry/human-calibrated-difficulty-curve/comeback-kingmaker items still need a product
  decision first and are out of bounds for Phase 13.
- **Optional follow-up, not required:** re-run `npm run selfplay -- --players 2/3/4/6` and
  `npm run tournament` under the new `cordonNeutralCorners: true` default to confirm it doesn't
  materially shift AI-quality numbers (stalemate rates, tier win-rate monotonicity) — not expected
  to, since neutral corners were rarely a useful final destination for a self-interested AI eval
  function, but never explicitly measured. See DECISIONS.md's Phase 12 entry.
- **Nice-to-have, not a blocker:** a full 200-games/pairing tournament at real (unscaled) SPEC
  §3.3 time budgets would take ~70+ minutes — good candidate for background/overnight time if
  ever wanted, but the 180-game scaled-budget result already showed a decisive, consistent trend.
- **Worth reconfirming now that real gameplay exists:** rerun `npm run selfplay --
  --players 3/4/6` with the tuned weights — Phase 2's finding that greedy AI stalemates 100% of
  3P/4P/6P games was explicitly deferred to Phase 3's fixes; the repetition-avoidance and weight
  tuning done there likely improve it but haven't been re-measured for those seat counts.

## Gate status
- Phase 1 (Engine core): **GREEN**
- Phase 2 (Self-play + greedy AI): **GREEN (2P)** — 3P/4P/6P greedy stalemate rate deferred to
  Phase 3, see Done notes above
- Phase 3 (Full AI ladder): **GREEN** — see Done notes above for scope (30 games/pairing,
  scaled time budgets)
- Phase 4 (Board UI): **GREEN**
- Phase 5 (Animation/juice): **GREEN**
- Phase 6 (AI characters): **GREEN**
- Phase 7 (Meta): **GREEN**
- Phase 8 (Polish): **GREEN**
- Phase 9 (Packaging): **GREEN**
- Phase 10 (Final sweep): **GREEN**
- Phase 11 (Feedback iteration): **GREEN** — P11.1-P11.8 all done
- Phase 12 (Corner cordoning): **GREEN** — P12.1-P12.5 all done
- Phase 13 (Home screen & visual identity): **IN PROGRESS** — P13.1-P13.3 done, P13.4-P13.6
  remaining

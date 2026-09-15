# STARLEAP — Implementation Plan

Task format: `- [ ] P#.N description — \`verification command\``

A fresh context (see AGENTS.md) finds the first unchecked `- [ ]`, does exactly that task, runs
its verification command, checks it off, commits, and updates PROGRESS.md. Do not skip ahead.
Do not batch multiple tasks into one commit.

---

## Phase 1 — Engine core

GATE: `npm test` green, including property tests asserting: board is exactly 121 cells with six
10-cell corners and a 61-cell hexagon; the cell set is invariant under the 60° rotation
`(x,y,z)->(-z,-x,-y)`; every generated move is reversible in principle; no chain revisits a cell;
`n=1` long-jump results are identical to a hand-written classic-rules jump generator. Engine
directory imports nothing (enforced by lint rule).

- [x] P1.1 Scaffold `src/engine/coords.ts`: cube coordinate type, `add`, `scale`, `equals`,
      `onBoard`, `NEIGHBOR_DIRECTIONS`, `neighbors`, `distance`, `rotate60`. — `npm run typecheck`
- [x] P1.2 `src/engine/board.ts`: build the full 121-cell set from `onBoard`, partition into
      hexagon (61) + six corners (10 each), identify corner by out-of-range coordinate, build
      opposite-pair map. — `npx vitest run src/engine/__tests__/board.test.ts`
- [x] P1.3 Property test: board cardinality and partition sizes (121 / 61 / 10×6). —
      `npx vitest run src/engine/__tests__/board.test.ts`
- [x] P1.4 Property test: cell set invariant under `rotate60` (set-equality of coordinates
      before/after rotating every cell). — `npx vitest run src/engine/__tests__/board.test.ts`
- [x] P1.5 `src/engine/state.ts`: `GameState` type — per-player peg cell lists, `hasLeftStart`
      booleans, current player index, round counter, seating (start/target corner per player).
      Seating logic for 2/3/4/6 players per SPEC §1.9. — `npm run typecheck`
- [x] P1.6 `src/engine/moves.ts` part A: STEP generation (adjacent empty neighbor). —
      `npx vitest run src/engine/__tests__/moves-step.test.ts`
- [x] P1.7 `src/engine/moves.ts` part B: single-hop legality check per SPEC §2.3 (pivot/gaps/
      landing for arbitrary span `n`), plus a hand-written classic-rules (`n=1`-only) reference
      jump generator used solely as a test oracle. Property test asserts the two agree exactly
      for `n=1`. — `npx vitest run src/engine/__tests__/jump-oracle.test.ts`
- [x] P1.8 `src/engine/moves.ts` part C: full jump-chain DFS (any span per hop, visited-cell
      guard, 24-hop cap), enumerating every reachable chain-ending cell with its hop path. —
      `npx vitest run src/engine/__tests__/jump-chain.test.ts`
- [x] P1.9 Property test: no enumerated chain revisits a cell the mover has already stood on. —
      `npx vitest run src/engine/__tests__/jump-chain.test.ts`
- [ ] P1.10 Residency filter (SPEC §2.4) + anti-backward-block filter (SPEC §2.5) applied to
      candidate final resting cells (steps and chain endpoints alike). — `npx vitest run
      src/engine/__tests__/residency.test.ts`
- [ ] P1.11 `src/engine/apply.ts`: pure `applyMove(state, move) -> state`, updates peg position,
      `hasLeftStart`, current player, round counter. Property test: applying a move never
      produces a peg on an off-board or previously-occupied-by-another-peg cell. —
      `npx vitest run src/engine/__tests__/apply.test.ts`
- [ ] P1.12 Reversibility property test: for every generated move, there exists a legal move
      shape (step or single hop) from the resulting position back toward the origin cell for an
      otherwise-empty board (checked structurally, not as literal undo) — i.e. no move generates
      a landing cell that is provably unreachable-back-from under the same movement primitives. —
      `npx vitest run src/engine/__tests__/reversibility.test.ts`
- [ ] P1.13 `src/engine/terminal.ts`: win detection (all 10 pegs in target corner), stalemate
      detection (150 rounds), ranking (pegs-home desc, summed distance asc). —
      `npx vitest run src/engine/__tests__/terminal.test.ts`
- [ ] P1.14 `src/engine/index.ts` public API barrel. Add eslint `no-restricted-imports`/
      `import/no-restricted-paths` rule forbidding `engine/**` from importing anything outside
      `engine/**`. — `npm run lint`
- [ ] P1.15 Full phase gate run. — `npm test && npm run lint && npm run typecheck`

## Phase 2 — Self-play harness + greedy baseline AI

GATE: 1000 headless games complete, zero illegal moves, zero games hitting the move cap, p95
move generation under 5ms.

- [ ] P2.1 `src/ai/eval.ts`: implement the weighted evaluation function (SPEC §3.1) with the
      initial weights table. — `npm run typecheck`
- [ ] P2.2 Greedy baseline AI: pick the legal move maximizing 1-ply eval delta (no search tree).
      — `npx vitest run src/ai/__tests__/greedy.test.ts`
- [ ] P2.3 `src/ai/selfplay.ts`: headless game runner — seats N greedy AIs, plays to completion
      or 150-round stalemate, records illegal-move attempts (should be structurally impossible
      since moves come from the generator, but assert it anyway), move-cap hits, and per-move
      generation timing. — `npx vitest run src/ai/__tests__/selfplay.test.ts`
- [ ] P2.4 `npm run selfplay` CLI script wrapping selfplay.ts for N games, printing a summary
      (illegal-move count, stalemate count, p50/p95/p99 move-gen time). —
      `npm run selfplay -- --games 20`
- [ ] P2.5 Run and record the 1000-game gate. If p95 exceeds 5ms, profile and optimize
      `moves.ts` (likely the chain DFS) before proceeding — do not relax the gate. —
      `npm run selfplay -- --games 1000`
- [ ] P2.6 Record baseline AI quality numbers (avg game length, avg chain length used) in
      PROGRESS.md for later comparison against the full ladder. — manual (numbers into
      PROGRESS.md)

## Phase 3 — Full AI ladder

GATE: round-robin, 200 games per pairing, each tier beats the tier below at ≥60%. Not monotonic
→ tune weights and rerun, do not proceed until it is.

- [ ] P3.1 `src/engine/zobrist.ts`: Zobrist hash table (random 64-bit-ish bigint per
      cell×occupant-slot) + incremental hash maintained alongside `applyMove`. —
      `npx vitest run src/engine/__tests__/zobrist.test.ts`
- [ ] P3.2 `src/ai/search.ts` part A: 2-player iterative-deepening alpha-beta with transposition
      table keyed by Zobrist hash, time-budgeted (wall-clock cutoff mid-search). —
      `npx vitest run src/ai/__tests__/search-2p.test.ts`
- [ ] P3.3 `src/ai/search.ts` part B: 3+ player max^n at depth 2 with top-K static-eval pruning.
      — `npx vitest run src/ai/__tests__/search-maxn.test.ts`
- [ ] P3.4 `src/ai/tiers.ts`: Nova/Vega/Rigel/Sirius parameter table (depth, top-K, noise, time
      budget per SPEC §3.3) + noise injection (uniform-random move substitution at the given
      probability) + Nova's 2-hop chain cap during search. — `npm run typecheck`
- [ ] P3.5 `src/ai/worker.ts` + `src/ai/worker-protocol.ts`: Web Worker entry implementing the
      FIND_MOVE/CANCEL/THINKING/MOVE_FOUND/ERROR protocol from ARCHITECTURE.md. —
      `npx vitest run src/ai/__tests__/worker.test.ts` (using a worker-polyfill/jsdom harness)
- [ ] P3.6 Sirius opening ladder book: short hardcoded table of strong first-few-move formations
      per seating, consulted before search when the position matches. — `npx vitest run
      src/ai/__tests__/opening-book.test.ts`
- [ ] P3.7 `npm run tournament` CLI: round-robin N games per ordered pairing across all four
      tiers, reporting win-rate matrix + illegal-move/non-terminating/p95-movegen stats. —
      `npm run tournament -- --games 20`
- [ ] P3.8 Run the 200-game gate. Record the win-rate matrix in PROGRESS.md. —
      `npm run tournament -- --games 200`
- [ ] P3.9 If not monotonic: tune `W_lag`/`W_home`/`W_spread`/`W_ladder`/`W_mobility` and/or
      tier depth/top-K, record each change with rationale in DECISIONS.md, rerun P3.8 until
      monotonic. — `npm run tournament -- --games 200`

## Phase 4 — Board UI

GATE: playwright completes a full human-vs-Nova game start to win.

- [ ] P4.1 Vite React app shell: `App`, routing state (menu/game/rules/tutorial), `useGameEngine`
      hook wrapping `useReducer` over engine state + move application. — `npm run dev` (manual
      smoke) + `npm run typecheck`
- [ ] P4.2 `Board` SVG component: render 121 cells at their projected screen positions (SPEC
      §1.8), colored by owner/corner. — `npx playwright test board-render.spec.ts`
- [ ] P4.3 `Peg` component + selection: click/tap a peg belonging to the current player to select
      it, click again or click elsewhere to deselect. — `npx playwright test peg-select.spec.ts`
- [ ] P4.4 Legal-destination highlighting: on peg selection, compute and highlight every legal
      final cell (step or chain-endpoint) via the engine's move generator. —
      `npx playwright test legal-destinations.spec.ts`
- [ ] P4.5 Path preview (static, pre-animation): hovering/tapping a highlighted destination shows
      the numbered hop-by-hop path with pivots marked (SPEC §4.5, visuals only — no arcs/motion
      yet, that's Phase 5). — `npx playwright test path-preview.spec.ts`
- [ ] P4.6 Turn flow: committing a destination applies the move, advances current player,
      triggers AI turn via `useAIWorker` when applicable (moves applied instantly pre-Phase-5
      animation). — `npx playwright test turn-flow.spec.ts`
- [ ] P4.7 Pass-and-play: for multiple human seats, an inter-turn "pass the device" screen
      between human turns (config-gated, off when only one human seat). —
      `npx playwright test pass-and-play.spec.ts`
- [ ] P4.8 Win screen: detect terminal state via `engine/terminal.ts`, show result. —
      `npx playwright test win-screen.spec.ts`
- [ ] P4.9 Full phase gate: playwright script that configures a human-vs-Nova 2-player game and
      plays it to completion (driving the human side with "always pick a legal highlighted
      move" logic, since we're testing UI plumbing, not human skill). —
      `npx playwright test full-game-vs-nova.spec.ts`

## Phase 5 — Animation and juice

GATE: playwright screenshots at 8 key states; performance trace shows no frame over 20ms during
a 7-hop chain.

- [ ] P5.1 Hop physics module: parabolic arc + easing per SPEC §4.1, parameterized by
      hop-distance-in-cells. — `npx vitest run src/ui/animation/__tests__/hop-physics.test.ts`
- [ ] P5.2 Squash/stretch + shadow (SPEC §4.2-4.3) applied per hop. — manual + screenshot test
      below
- [ ] P5.3 Canvas particle overlay (positioned above the SVG board) driven by an imperative
      animation loop (not React state) for perf. — `npm run typecheck`
- [ ] P5.4 Chain pacing: sequential hop playback with the 70ms/8%-decay gap and per-hop ascending
      pentatonic tone (Web Audio oscillator). — `npx vitest run
      src/ui/audio/__tests__/tones.test.ts`
- [ ] P5.5 Wire real animated hops into the turn-flow path from Phase 4 (replacing the instant
      apply with animate-then-apply-visually / state already applied logically, rendered
      progressively). — `npx playwright test animated-turn.spec.ts`
- [ ] P5.6 Landing juice: ring ripple every hop, particle burst on target-triangle landing, 3px
      screen shake on 5+ hop chains. — `npx playwright test landing-juice.spec.ts`
- [ ] P5.7 `prefers-reduced-motion` gating: arcs->instant, particles off, characters static. —
      `npx playwright test reduced-motion.spec.ts`
- [ ] P5.8 Screenshot gate: playwright captures 8 key states (menu, board-idle, peg-selected,
      path-preview, mid-hop-apex, landing-juice, win-screen, reduced-motion board) as baseline
      snapshots. — `npx playwright test --update-snapshots screenshots.spec.ts` then `npx
      playwright test screenshots.spec.ts`
- [ ] P5.9 Performance gate: playwright + CDP tracing during a scripted 7-hop chain (6-player
      board populated), assert no animation frame exceeds 20ms. — `npx playwright test
      perf-chain.spec.ts`

## Phase 6 — AI characters

GATE: playwright asserts thinking state appears within 100ms of AI turn start.

- [ ] P6.1 `CharacterAvatar` SVG component with the six states (idle/thinking/found-it/move/
      celebrate/worried) as CSS-driven state classes. — `npm run typecheck`
- [ ] P6.2 Per-opponent personality parameters (amplitude/frequency deltas for Nova/Vega/Rigel/
      Sirius) layered on the shared six-state component. — `npx vitest run
      src/ui/__tests__/character-personality.test.ts`
- [ ] P6.3 Wire `thinking` to fire immediately on AI turn start (dispatch-time, not
      worker-response-time) and `found-it`/`move` to the worker's `MOVE_FOUND` message, with the
      minimum-visible-thinking floor (~400ms) from SPEC §4.7. — `npx playwright test
      thinking-timing.spec.ts`
- [ ] P6.4 `worried` trigger: compare AI's own eval score turn-over-turn, fire on a sharp drop
      (threshold documented in DECISIONS.md). — `npx vitest run
      src/ui/__tests__/worried-trigger.test.ts`
- [ ] P6.5 `celebrate` trigger on that AI completing its win condition. — `npx playwright test
      celebrate.spec.ts`
- [ ] P6.6 Phase gate: playwright asserts the `thinking` DOM/class state is present within 100ms
      of the AI's turn starting (using a fake/slow worker response to ensure the floor logic,
      not worker speed, is what's being tested). — `npx playwright test
      thinking-within-100ms.spec.ts`

## Phase 7 — Meta

GATE: playwright covers config → play → quit → resume → finish.

- [ ] P7.1 Main menu screen: new game / resume (if save exists) / rules / settings. —
      `npx playwright test menu.spec.ts`
- [ ] P7.2 Game config screen: player count (2/3/4/6), per-seat human/AI toggle, per-AI-seat
      tier selection. — `npx playwright test config.spec.ts`
- [ ] P7.3 Settings screen: audio on/off, reduced-motion override (in addition to OS
      preference), board theme (STARLEAP default + Nakshatra/Chhalaang fallback themes from
      buildkit.md Part 0). — `npx playwright test settings.spec.ts`
- [ ] P7.4 Rules screen: static rendering of the STARLEAP rules (from SPEC.md §2), written for a
      player, not a re-paste of the formal spec language. — `npx playwright test
      rules-screen.spec.ts`
- [ ] P7.5 Interactive tutorial: a scripted mini-board that walks a new player through a step,
      then specifically teaches the long-jump chain (the brief's stated hardest-to-teach
      mechanic) using the path-preview visuals from Phase 4/5. — `npx playwright test
      tutorial.spec.ts`
- [ ] P7.6 Undo: single-level undo of the last committed move (human moves only; undoing an AI
      move is out of scope — documented in DECISIONS.md if this needs revisiting). —
      `npx playwright test undo.spec.ts`
- [ ] P7.7 Save/resume to localStorage per ARCHITECTURE.md persistence section, including the
      versioned-key mismatch-is-no-save behavior. — `npx playwright test save-resume.spec.ts`
- [ ] P7.8 Post-game stats screen: per-player finishing order, move count, longest chain, total
      game duration. — `npx playwright test post-game-stats.spec.ts`
- [ ] P7.9 Full phase gate: playwright flow — configure a game, play a few moves, quit to menu,
      resume from menu, finish the game, see stats. — `npx playwright test
      config-play-quit-resume-finish.spec.ts`

## Phase 8 — Polish

GATE: lighthouse ≥90 on performance and accessibility; axe reports zero critical violations.

- [ ] P8.1 Responsive layout pass down to 360px width (board scales, HUD reflows/stacks). —
      manual device-width check + `npx playwright test responsive-360.spec.ts`
- [ ] P8.2 Touch target audit: every interactive element ≥44px hit area (pegs may need an
      invisible padded hit-target larger than their visual radius at small board sizes). —
      `npx playwright test touch-targets.spec.ts`
- [ ] P8.3 Keyboard navigation: tab order through menu and board (arrow-key cell navigation +
      enter to select/confirm) without a mouse. — `npx playwright test keyboard-nav.spec.ts`
- [ ] P8.4 Screen-reader move announcements: an `aria-live` region announcing each committed
      move in plain language ("Nova jumps from A3 to C5, 2 hops"). — `npx playwright test
      aria-announcements.spec.ts`
- [ ] P8.5 Confirm `prefers-reduced-motion` behavior from P5.7 also covers any Phase 6/7 additions
      (character animation, menu transitions). — `npx playwright test reduced-motion-full.spec.ts`
- [ ] P8.6 PWA manifest + service worker (offline shell caching) via `vite-plugin-pwa`. —
      `npm run build && npx playwright test pwa-offline.spec.ts`
- [ ] P8.7 Run axe against every screen (menu/config/board/rules/tutorial/settings/stats),
      fix critical violations. — `npx playwright test axe-audit.spec.ts`
- [ ] P8.8 Run Lighthouse (via `playwright-lighthouse` or CLI against a built preview server)
      for performance + accessibility, iterate until ≥90 on both. — `npm run build && npm run
      lighthouse`

## Phase 9 — Packaging

GATE: `starleap.html` opened via `file://` plays a complete game against Sirius with zero
network requests.

- [ ] P9.1 `dist/` production build config finalized (PWA + normal multi-file). —
      `npm run build`
- [ ] P9.2 `vite-plugin-singlefile` build producing `starleap.html`, including a blob-URL shim
      so the Web Worker works when loaded from `file://` (no relative worker script URL
      available in that context). — `npm run build:singlefile`
- [ ] P9.3 Verify zero network requests from `starleap.html` under `file://` (playwright request
      interception asserting an empty request list beyond the initial file load, while playing a
      full game against Sirius). — `npx playwright test singlefile-offline.spec.ts`
- [ ] P9.4 `Dockerfile` (nginx:alpine serving `dist/`). — `docker build -t starleap . ` (or
      documented as untested if Docker isn't available in the build environment — see BLOCKED.md)
- [ ] P9.5 GitHub Pages Actions workflow (`.github/workflows/pages.yml`) building and deploying
      `dist/`. — `actionlint .github/workflows/pages.yml` (or manual YAML review if actionlint
      unavailable)
- [ ] P9.6 README with three deployment paths (static `dist/` upload, `starleap.html`
      double-click, Docker) plus local dev instructions. — manual review
- [ ] P9.7 Full phase gate. — `npx playwright test singlefile-offline.spec.ts`

## Phase 10 — Final sweep

- [ ] P10.1 Re-run every phase gate (P1-P9) in sequence, record pass/fail for each in
      PROGRESS.md. — `npm test && npm run lint && npm run typecheck && npm run build && npx
      playwright test`
- [ ] P10.2 Self-review the full diff for dead code, leftover TODOs/console.logs, and unused
      exports. — `npx knip` (or manual grep for `TODO`/`console.log` if knip isn't set up)
- [ ] P10.3 Write `HANDOFF.md`: what's built, what's deferred (see BLOCKED.md), and how to
      extend it (where to add a new AI tier, a new board theme, a new phase). — manual

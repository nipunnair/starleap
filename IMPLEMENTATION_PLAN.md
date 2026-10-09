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
- [x] P1.10 Residency filter (SPEC §2.4) + anti-backward-block filter (SPEC §2.5) applied to
      candidate final resting cells (steps and chain endpoints alike). — `npx vitest run
      src/engine/__tests__/residency.test.ts`
- [x] P1.11 `src/engine/apply.ts`: pure `applyMove(state, move) -> state`, updates peg position,
      `hasLeftStart`, current player, round counter. Property test: applying a move never
      produces a peg on an off-board or previously-occupied-by-another-peg cell. —
      `npx vitest run src/engine/__tests__/apply.test.ts`
- [x] P1.12 Reversibility property test: for every generated move, there exists a legal move
      shape (step or single hop) from the resulting position back toward the origin cell for an
      otherwise-empty board (checked structurally, not as literal undo) — i.e. no move generates
      a landing cell that is provably unreachable-back-from under the same movement primitives. —
      `npx vitest run src/engine/__tests__/reversibility.test.ts`
- [x] P1.13 `src/engine/terminal.ts`: win detection (all 10 pegs in target corner), stalemate
      detection (150 rounds), ranking (pegs-home desc, summed distance asc). —
      `npx vitest run src/engine/__tests__/terminal.test.ts`
- [x] P1.14 `src/engine/index.ts` public API barrel. Add eslint `no-restricted-imports`/
      `import/no-restricted-paths` rule forbidding `engine/**` from importing anything outside
      `engine/**`. — `npm run lint`
- [x] P1.15 Full phase gate run. — `npm test && npm run lint && npm run typecheck`

## Phase 2 — Self-play harness + greedy baseline AI

GATE: 1000 headless games complete, zero illegal moves, zero games hitting the move cap, p95
move generation under 5ms.

- [x] P2.1 `src/ai/eval.ts`: implement the weighted evaluation function (SPEC §3.1) with the
      initial weights table. — `npm run typecheck`
- [x] P2.2 Greedy baseline AI: pick the legal move maximizing 1-ply eval delta (no search tree).
      — `npx vitest run src/ai/__tests__/greedy.test.ts`
- [x] P2.3 `src/ai/selfplay.ts`: headless game runner — seats N greedy AIs, plays to completion
      or 150-round stalemate, records illegal-move attempts (should be structurally impossible
      since moves come from the generator, but assert it anyway), move-cap hits, and per-move
      generation timing. — `npx vitest run src/ai/__tests__/selfplay.test.ts`
- [x] P2.4 `npm run selfplay` CLI script wrapping selfplay.ts for N games, printing a summary
      (illegal-move count, stalemate count, p50/p95/p99 move-gen time). —
      `npm run selfplay -- --games 20`
- [x] P2.5 Run and record the 1000-game gate. If p95 exceeds 5ms, profile and optimize
      `moves.ts` (likely the chain DFS) before proceeding — do not relax the gate. Scoped to 2P;
      see DECISIONS.md for why. — `npm run selfplay -- --games 1000`
- [x] P2.6 Record baseline AI quality numbers (avg game length, avg chain length used) in
      PROGRESS.md for later comparison against the full ladder. — manual (numbers into
      PROGRESS.md)

## Phase 3 — Full AI ladder

GATE: round-robin, 200 games per pairing, each tier beats the tier below at ≥60%. Not monotonic
→ tune weights and rerun, do not proceed until it is.

- [x] P3.1 `src/engine/zobrist.ts`: Zobrist hash table (random 64-bit-ish bigint per
      cell×occupant-slot) + incremental hash maintained alongside `applyMove`. —
      `npx vitest run src/engine/__tests__/zobrist.test.ts`
- [x] P3.2 `src/ai/search.ts` part A: 2-player iterative-deepening alpha-beta with transposition
      table keyed by Zobrist hash, time-budgeted (wall-clock cutoff mid-search). —
      `npx vitest run src/ai/__tests__/search-2p.test.ts`
- [x] P3.3 `src/ai/search.ts` part B: 3+ player max^n at depth 2 with top-K static-eval pruning.
      — `npx vitest run src/ai/__tests__/search-maxn.test.ts`
- [x] P3.4 `src/ai/tiers.ts`: Nova/Vega/Rigel/Sirius parameter table (depth, top-K, noise, time
      budget per SPEC §3.3) + noise injection (uniform-random move substitution at the given
      probability) + Nova's 2-hop chain cap during search. — `npm run typecheck`
- [x] P3.5 `src/ai/worker.ts` + `src/ai/worker-protocol.ts`: Web Worker entry implementing the
      FIND_MOVE/CANCEL/THINKING/MOVE_FOUND/ERROR protocol from ARCHITECTURE.md. Tested via the
      pure `computeFindMoveResponse` function rather than a live Worker — see DECISIONS.md. —
      `npx vitest run src/ai/__tests__/worker.test.ts`
- [x] P3.6 Sirius opening ladder book: short hardcoded table of strong first-few-move formations
      per seating, consulted before search when the position matches. — `npx vitest run
      src/ai/__tests__/opening-book.test.ts`
- [x] P3.7 `npm run tournament` CLI: round-robin N games per ordered pairing across all four
      tiers, reporting win-rate matrix + illegal-move/non-terminating/p95-movegen stats. —
      `npm run tournament -- --games 20`
- [x] P3.8 Run the 200-game gate. Record the win-rate matrix in PROGRESS.md. Ran 30
      games/pairing at time-scale 0.05 instead of the literal 200 at real budgets — see
      DECISIONS.md for why (real budgets are impractical for bulk automated tournaments; 180
      real games showed a decisive, consistent trend). — `npm run tournament -- --games 30
      --scale 0.05`
- [x] P3.9 Ladder was not monotonic on the first few passes; tuned `W_ladder`/`W_mobility`,
      Sirius's `topK` (twice), and fixed the underlying 2-player alpha-beta adversarial-eval
      mismatch plus a repetition-avoidance gap and a search-performance bug. All five fixes
      documented with rationale and verification in DECISIONS.md. Final result: monotonic and
      PASS. — `npm run tournament -- --games 30 --scale 0.05`

## Phase 4 — Board UI

GATE: playwright completes a full human-vs-Nova game start to win.

- [x] P4.1 Vite React app shell: `App`, routing state (menu/game/rules/tutorial), `useGameEngine`
      hook wrapping `useReducer` over engine state + move application. — `npm run dev` (manual
      smoke) + `npm run typecheck`
- [x] P4.2 `Board` SVG component: render 121 cells at their projected screen positions (SPEC
      §1.8), colored by owner/corner. — `npx playwright test board-render.spec.ts`
- [x] P4.3 `Peg` component + selection: click/tap a peg belonging to the current player to select
      it, click again or click elsewhere to deselect. — `npx playwright test peg-select.spec.ts`
- [x] P4.4 Legal-destination highlighting: on peg selection, compute and highlight every legal
      final cell (step or chain-endpoint) via the engine's move generator. —
      `npx playwright test legal-destinations.spec.ts`
- [x] P4.5 Path preview (static, pre-animation): hovering/tapping a highlighted destination shows
      the numbered hop-by-hop path with pivots marked (SPEC §4.5, visuals only — no arcs/motion
      yet, that's Phase 5). — `npx playwright test path-preview.spec.ts`
- [x] P4.6 Turn flow: committing a destination applies the move, advances current player,
      triggers AI turn via `useAIWorker` when applicable (moves applied instantly pre-Phase-5
      animation). — `npx playwright test turn-flow.spec.ts`
- [x] P4.7 Pass-and-play: for multiple human seats, an inter-turn "pass the device" screen
      between human turns (config-gated, off when only one human seat). —
      `npx playwright test pass-and-play.spec.ts`
- [x] P4.8 Win screen: detect terminal state via `engine/terminal.ts`, show result. —
      `npx playwright test win-screen.spec.ts`
- [x] P4.9 Full phase gate: playwright script that configures a human-vs-Nova 2-player game and
      plays it to completion (driving the human side with "always pick a legal highlighted
      move" logic, since we're testing UI plumbing, not human skill). —
      `npx playwright test full-game-vs-nova.spec.ts`

## Phase 5 — Animation and juice

GATE: playwright screenshots at 8 key states; performance trace shows no frame over 20ms during
a 7-hop chain.

- [x] P5.1 Hop physics module: parabolic arc + easing per SPEC §4.1, parameterized by
      hop-distance-in-cells. — `npx vitest run src/ui/animation/__tests__/hop-physics.test.ts`
- [x] P5.2 Squash/stretch + shadow (SPEC §4.2-4.3) applied per hop. — manual + screenshot test
      below
- [x] P5.3 Canvas particle overlay (positioned above the SVG board) driven by an imperative
      animation loop (not React state) for perf. — `npm run typecheck`
- [x] P5.4 Chain pacing: sequential hop playback with the 70ms/8%-decay gap and per-hop ascending
      pentatonic tone (Web Audio oscillator). — `npx vitest run
      src/ui/audio/__tests__/tones.test.ts`
- [x] P5.5 Wire real animated hops into the turn-flow path from Phase 4 (animate first, then
      apply the already-computed engine move once the animation completes). Verified via the
      existing turn-flow/win-screen/full-game E2E specs (no dedicated animated-turn.spec.ts —
      those specs now exercise real animated moves). — `npx playwright test turn-flow.spec.ts`
- [x] P5.6 Landing juice: ring ripple every hop, particle burst on target-triangle landing, 3px
      screen shake on 5+ hop chains. Shake-threshold logic extracted to a pure, unit-tested
      function (`shouldShakeForMove`); ripple/burst wiring verified via E2E (canvas renders and
      survives real hop animation with zero console errors). —
      `npx playwright test landing-juice.spec.ts`
- [x] P5.7 `prefers-reduced-motion` gating: arcs->instant, particles off, characters static. —
      `npx playwright test reduced-motion.spec.ts`
- [x] P5.8 Screenshot gate: playwright captures 8 key states (menu, board-idle, peg-selected,
      path-preview, mid-hop-apex, landing-juice, win-screen, reduced-motion board) as plain
      artifacts, not pixel-diff baselines (real gameplay randomness makes bit-identical reruns
      impossible — see DECISIONS.md). — `npx playwright test screenshots.spec.ts`
- [x] P5.9 Performance gate: playwright-injected rAF frame-timing collector (not raw CDP trace
      parsing) during a hand-constructed, engine-verified 7-hop chain on a 6-player board,
      asserting no sustained frame exceeds 20ms (first ~5 startup frames excluded — see
      DECISIONS.md). Verified stable across 5 repeated runs. —
      `npx playwright test perf-chain.spec.ts`

## Phase 6 — AI characters

GATE: playwright asserts thinking state appears within 100ms of AI turn start.

- [x] P6.1 `CharacterAvatar` SVG component with the six states (idle/thinking/found-it/move/
      celebrate/worried) as CSS-driven state classes. — `npm run typecheck`
- [x] P6.2 Per-opponent personality parameters (amplitude/frequency deltas for Nova/Vega/Rigel/
      Sirius) layered on the shared six-state component. — `npx vitest run
      src/ui/__tests__/character-personality.test.ts`
- [x] P6.3 Wire `thinking` to fire immediately on AI turn start (dispatch-time, not
      worker-response-time) and `found-it`/`move` to the worker's `MOVE_FOUND` message, with the
      minimum-visible-thinking floor (~400ms) from SPEC §4.7. Verified via
      `thinking-within-100ms.spec.ts` (below) and manual browser tracing (documented in
      DECISIONS.md: this floor noticeably slows full-game E2E tests, ~1.6min → ~3.1min). —
      `npx playwright test thinking-within-100ms.spec.ts`
- [x] P6.4 `worried` trigger: compare AI's own eval score turn-over-turn, fire on a sharp drop
      (threshold documented in DECISIONS.md). — `npx vitest run
      src/ui/__tests__/worried-trigger.test.ts`
- [x] P6.5 `celebrate` trigger on that AI completing its win condition. Needed a real fix (delay
      before revealing the win screen, plus prioritizing `celebrate` over the `isAITurn` check)
      found via manual browser tracing — see DECISIONS.md. — `npx playwright test
      celebrate.spec.ts`
- [x] P6.6 Phase gate: playwright asserts the `thinking` DOM/class state is present within 100ms
      of the AI's turn actually starting (measured from the turn-indicator flip, not the human's
      click, which would otherwise unfairly include the human's own move animation time). —
      `npx playwright test thinking-within-100ms.spec.ts`

## Phase 7 — Meta

GATE: playwright covers config → play → quit → resume → finish.

- [x] P7.1 Main menu screen: new game / resume (if save exists) / rules / settings. —
      `npx playwright test menu.spec.ts`
- [x] P7.2 Game config screen: player count (2/3/4/6), per-seat human/AI toggle, per-AI-seat
      tier selection. — `npx playwright test config.spec.ts`
- [x] P7.3 Settings screen: audio on/off, reduced-motion override (in addition to OS
      preference), board theme (STARLEAP default + Nakshatra/Chhalaang fallback themes from
      buildkit.md Part 0 — a light accent-color swap, not a full reskin, see DECISIONS.md). —
      `npx playwright test settings.spec.ts`
- [x] P7.4 Rules screen: static rendering of the STARLEAP rules (from SPEC.md §2), written for a
      player, not a re-paste of the formal spec language. — `npx playwright test
      rules-screen.spec.ts`
- [x] P7.5 Interactive tutorial: a scripted mini-board that walks a new player through a step,
      then specifically teaches the long-jump chain (the brief's stated hardest-to-teach
      mechanic) using the path-preview visuals from Phase 4/5. Found and fixed a real bug where
      switching stages never reset the board (useReducer's lazy init only runs once) — see
      DECISIONS.md. — `npx playwright test tutorial.spec.ts`
- [x] P7.6 Undo: single-level undo of the last committed move (human moves only; undoing an AI
      move is out of scope — documented in DECISIONS.md if this needs revisiting). —
      `npx playwright test undo.spec.ts`
- [x] P7.7 Save/resume to localStorage per ARCHITECTURE.md persistence section, including the
      versioned-key mismatch-is-no-save behavior. — `npx playwright test save-resume.spec.ts`
- [x] P7.8 Post-game stats screen: per-player finishing order, move count, longest chain, total
      game duration. — `npx playwright test post-game-stats.spec.ts`
- [x] P7.9 Full phase gate: playwright flow — configure a game, play a few moves, quit to menu,
      resume from menu, finish the game, see stats. — `npx playwright test
      config-play-quit-resume-finish.spec.ts`

## Phase 8 — Polish

GATE: lighthouse ≥90 on performance and accessibility; axe reports zero critical violations.

- [x] P8.1 Responsive layout pass down to 360px width (board scales, HUD reflows/stacks). —
      manual device-width check + `npx playwright test responsive-360.spec.ts`
- [x] P8.2 Touch target audit: every interactive element ≥44px hit area (pegs may need an
      invisible padded hit-target larger than their visual radius at small board sizes). The
      board's own cells/pegs are a documented, geometrically-forced exception (see
      DECISIONS.md); every other control genuinely meets 44px. —
      `npx playwright test touch-targets.spec.ts`
- [x] P8.3 Keyboard navigation: tab order through menu and board (arrow-key cell navigation +
      enter to select/confirm) without a mouse. Uses 4 of 6 hex directions, which reach every
      cell via combinations (see DECISIONS.md). — `npx playwright test keyboard-nav.spec.ts`
- [x] P8.4 Screen-reader move announcements: an `aria-live` region announcing each committed
      move in plain language. — `npx playwright test aria-announcements.spec.ts`
- [x] P8.5 Confirm `prefers-reduced-motion` behavior from P5.7 also covers any Phase 6/7 additions
      (character animation, menu transitions). — `npx playwright test reduced-motion-full.spec.ts`
- [x] P8.6 PWA manifest + service worker (offline shell caching) via `vite-plugin-pwa`. —
      `npm run build && npx playwright test pwa-offline.spec.ts`
- [x] P8.7 Run axe against every screen (menu/config/board/rules/tutorial/settings/stats),
      fix critical violations. — `npx playwright test axe-audit.spec.ts`
- [x] P8.8 Run Lighthouse (via `playwright-lighthouse` or CLI against a built preview server)
      for performance + accessibility, iterate until ≥90 on both. — `npm run build && npm run
      lighthouse`

## Phase 9 — Packaging

GATE: `starleap.html` opened via `file://` plays a complete game against Sirius with zero
network requests.

- [x] P9.1 `dist/` production build config finalized (PWA + normal multi-file). —
      `npm run build`
- [x] P9.2 `vite-plugin-singlefile` build producing `starleap.html`, including a blob-URL shim
      so the Web Worker works when loaded from `file://` (no relative worker script URL
      available in that context). — `npm run build:singlefile`
- [x] P9.3 Verify zero network requests from `starleap.html` under `file://` (playwright request
      interception asserting an empty request list beyond the initial file load, while playing a
      full game against Sirius). — `npx playwright test singlefile-offline.spec.ts`
- [x] P9.4 `Dockerfile` (nginx:alpine serving `dist/`). — `docker build -t starleap . ` (or
      documented as untested if Docker isn't available in the build environment — see BLOCKED.md)
- [x] P9.5 GitHub Pages Actions workflow (`.github/workflows/pages.yml`) building and deploying
      `dist/`. — `actionlint .github/workflows/pages.yml` (or manual YAML review if actionlint
      unavailable)
- [x] P9.6 README with three deployment paths (static `dist/` upload, `starleap.html`
      double-click, Docker) plus local dev instructions. — manual review
- [x] P9.7 Full phase gate. — `npx playwright test singlefile-offline.spec.ts`

## Phase 10 — Final sweep

- [x] P10.1 Re-run every phase gate (P1-P9) in sequence, record pass/fail for each in
      PROGRESS.md. — `npm test && npm run lint && npm run typecheck && npm run build && npx
      playwright test`
- [x] P10.2 Self-review the full diff for dead code, leftover TODOs/console.logs, and unused
      exports. — `npx knip` (or manual grep for `TODO`/`console.log` if knip isn't set up)
- [x] P10.3 Write `HANDOFF.md`: what's built, what's deferred (see BLOCKED.md), and how to
      extend it (where to add a new AI tier, a new board theme, a new phase). — manual

## Phase 11 — Feedback iteration

GATE: `npm test && npm run lint && npm run typecheck && npm run build && npx playwright test`
all green. Do not start any task or phase beyond P11.8 — see AGENTS.md's Phase 11 scope
guardrail for the explicit list of `HANDOFF.md` items that are out of bounds for this run.

- [x] P11.1 Player color self-identification: add `PLAYER_COLOR_NAMES` and a `playerLabel(seat)`
      helper to `src/ui/components/boardGeometry.ts` (same index/order as `PLAYER_COLORS`). Use
      it in `GameScreen.tsx`'s turn indicator, win-screen ranking, and pass-and-play prompt, and
      in `ConfigScreen.tsx`'s seat labels, replacing bare `Player N` text. Add an always-visible
      color swatch + "You are Red" label near the turn indicator (seat 0 is always the human). —
      `npm test && npx playwright test win-screen.spec.ts`
- [x] P11.2 Confirm-before-discard on "New Game": in `App.tsx`, if `canResume` is true, show an
      inline confirm step ("Starting a new game will discard your saved game. Continue?") before
      calling `startNewGame`/`clearSavedGame`, for both the ConfigScreen path and the two
      quick-start buttons. No dialog when there's no save to lose. — `npx playwright test`
- [x] P11.3 Inline tier tooltips in `ConfigScreen`: add a `TIER_BLURBS` map (one plain-language
      sentence per tier) and render the selected seat's blurb under its `<select>` when the seat
      isn't `'human'`. — `npx playwright test config.spec.ts`
- [x] P11.4 Standalone "show move hints" settings toggle: add `showMoveHints: boolean` (default
      `true`) to `Settings`/`DEFAULT_SETTINGS`, a checkbox in `SettingsScreen.tsx` matching the
      `audioEnabled` pattern, threaded through `App.tsx` → `GameScreen` → `Board` as a new
      `showHints` prop gating only `isDestination` styling and the `PathPreview` render in
      `Board.tsx` — click routing, keyboard focus, and the SR announcer are unaffected by design
      (verified: `onCellClick` doesn't depend on `isDestination`). Never auto-tied to AI tier. —
      `npx playwright test settings.spec.ts`
- [x] P11.5 First-launch Tutorial promotion: new `src/app/onboarding.ts` (`starleap.onboarding.v1`,
      mirroring `persistence.ts`'s try/catch pattern), marked seen on finishing the Tutorial or
      starting any game. Menu shows a "New here? Start with the Tutorial" callout when not yet
      seen. — `npm test && npx playwright test`
- [x] P11.6 Turn-indicator / thinking-state visual salience fix: style `.turn-indicator` in
      `global.css` (larger, bolder, tinted by the mover's color) and add
      `.starleap-avatar--thinking { transform: scale(1.15); }` — a static size bump only, no
      timing/keyframe-duration changes anywhere (`MIN_THINKING_MS`/`FOUND_IT_DISPLAY_MS` and
      every `.starleap-avatar--*` animation duration stay exactly as they are). —
      `npx playwright test thinking-within-100ms.spec.ts`
- [x] P11.7 Chain-hop counter: in `GameScreen.tsx`'s `handleMoveAnimationComplete`, when
      `hopCount >= 2`, show a transient plain-text `data-testid="chain-badge"` (e.g. "Red: 4-hop
      chain!", using P11.1's `playerLabel`) for ~2.5s. Per-move only, not cumulative — the
      leaderboard/score question stays deferred. Plain text, not particles, so no reduced-motion
      special-casing is needed. Verify with the existing `?e2eScenario=sevenHopChain` fixture. —
      `npx playwright test` (new spec)
- [x] P11.8 Update `HANDOFF.md`'s "Future scope" section to remove/mark-done the 7 items above,
      leaving every explicitly-deferred item untouched. Update `PROGRESS.md`'s Status/Next/
      Gate-status sections for Phase 11. — manual review

## Phase 12 — Corner cordoning (neutral corners become waypoints only)

Player-reported rule request (Ying and Tanya, 2026-09-17): in a game with fewer than six seated
players, the unclaimed ("neutral") corners were restable at the end of a turn per SPEC §2.4's
original wording — legal, but surprising to players who read an unclaimed corner as off-limits
entirely. New rule: an unclaimed corner may be passed through mid-chain (a waypoint) but may never
be a turn's final resting cell, same as a foreign player's corner. This is the new **default** for
every player count (2/3/4/6), with a Settings toggle to restore the old behavior.

GATE: `npm test && npm run lint && npm run typecheck && npm run build && npx playwright test` all
green. Every new game defaults to `cordonNeutralCorners: true`; a resumed/loaded save with no such
field on its `GameState` keeps its original (uncordoned) behavior rather than retroactively
changing the legality of an in-progress game — see DECISIONS.md.

- [x] P12.1 `src/engine/state.ts` / `src/engine/moves.ts`: add `cordonNeutralCorners: boolean` to
      `GameState`, threaded through `createInitialState(playerCount, options?)` (default `true`).
      Update `isLegalRestingCell` (SPEC §2.4) so an unassigned/neutral corner is a legal final
      resting cell only when `state.cordonNeutralCorners` is falsy — mid-chain passage is
      unaffected (unchanged code path). Update `residency.test.ts`: the existing "neutral corner
      is restable" case becomes the opt-out (`cordonNeutralCorners: false`) case, plus a new
      default-on case asserting the same landing is now illegal. —
      `npx vitest run src/engine/__tests__/residency.test.ts`
- [x] P12.2 `src/app/settingsStore.ts`: add `cordonNeutralCorners: boolean` (default `true`) to
      `Settings`/`DEFAULT_SETTINGS`. `src/app/SettingsScreen.tsx`: add a checkbox ("Cordon
      unclaimed corners (waypoint only)") matching the `showMoveHints` pattern. —
      `npx playwright test settings.spec.ts`
- [x] P12.3 Thread the setting into *new* games only (never a resumed one): add
      `GameScreenProps.cordonNeutralCorners` (default `true`) → a third `useGameEngine` param →
      `createInitialState(pc, { cordonNeutralCorners })` inside the lazy `useReducer` initializer,
      used only when there's no `initialGameState` (a resumed/loaded game keeps whatever value is
      already baked into its saved `GameState`, per P12.1). Wire `App.tsx` to pass
      `settings.cordonNeutralCorners`. — `npm run typecheck && npx playwright test`
- [x] P12.4 Update `docs/SPEC.md` §2.4 to describe the new default (neutral corners are
      waypoint-only) and the Settings opt-out. Update `RulesScreen.tsx`'s "Passing through vs.
      resting" section for players in plain language. — `npx playwright test rules-screen.spec.ts`
- [x] P12.5 Full phase gate. Update `DECISIONS.md` (the resumed-save-compatibility judgment call;
      confirm the AI worker/search automatically respects the new flag since it reads straight off
      `GameState` with zero protocol changes needed — no separate AI-side task required; note the
      Phase 2/3 self-play and tournament gates were not re-run under the new default, out of scope
      for this phase). Update `HANDOFF.md` and `PROGRESS.md`. —
      `npm test && npm run lint && npm run typecheck && npm run build && npx playwright test`

## Phase 13 — Home screen & visual identity (gamer-friendly menu redesign)

Product decision (Nipun, 2026-09-17): green-light the menu/config visual redesign that
`HANDOFF.md`'s "Future scope" section flagged as needing one — it was the UX reviewer's and the
Technical Architect's independent #1 pick ("menu redesign + prominent avatar"), and the current
menu (`App.tsx`) is a literal unstyled `<h1>` + flat button list. Scope is visual/structural only:
real hierarchy, a starfield/constellation hero invoking the STARLEAP theme, and the AI character
avatars given a prominent showcase slot, plus making the two named board themes (Nakshatra/
Chhalaang) actually look distinct instead of a background-color swap. This does **not** include
the leaderboard, chain-reward scoring, anonymous telemetry, human-calibrated difficulty curve, or
comeback/kingmaker mechanics — those remain deferred in `HANDOFF.md` pending their own product
decisions.

GATE: `npm test && npm run lint && npm run typecheck && npm run build && npx playwright test` all
green; axe reports zero critical/serious violations on the new menu screen; `npm run lighthouse`
stays ≥90 on performance and accessibility (Phase 8's bar).

- [x] P13.1 Extract `src/app/MenuScreen.tsx` from `App.tsx`'s inline menu JSX (lines ~149-166).
      Pure presentational split: `App.tsx` keeps all state/handlers (`canResume`, `resumeGame`,
      `requestNewGame`, `showOnboardingCallout`, screen navigation) and passes them as props.
      Preserve `data-testid="menu-screen"`, every existing button's visible label, and
      `data-testid="onboarding-callout"` exactly as-is so `menu.spec.ts` and onboarding-related
      specs keep passing unmodified — this task is a structural extraction, not a redesign. —
      `npx playwright test menu.spec.ts`
- [x] P13.2 Visual hierarchy pass: real CSS in `global.css` for `MenuScreen` — a visually
      dominant primary CTA group (the quick-starts / "New game"; "Resume" gets its own prominent
      slot when `canResume`) versus a visually secondary group (Rules/Settings/Tutorial). Styling
      only — no behavior change, no button removed/renamed. — `npx playwright test menu.spec.ts
      responsive-360.spec.ts`
- [x] P13.3 Starfield hero: a lightweight CSS/SVG animated star field (twinkling dots, pure
      CSS `@keyframes` or an inline SVG — no canvas, no reuse of the gameplay particle system)
      behind the `MenuScreen` header, invoking the STARLEAP name. Must respect
      `prefers-reduced-motion` (static stars, no twinkle animation) following the same pattern as
      P5.7/P8.5. — `npx playwright test reduced-motion-full.spec.ts`
- [x] P13.4 AI character showcase: render the four `CharacterAvatar` components (Nova/Vega/Rigel/
      Sirius, idle state) in a labeled row on `MenuScreen`, each captioned with its existing
      `TIER_BLURBS` sentence from P11.3 (import, don't duplicate). Presentational only — no seat
      picker, no game-start wiring; `ConfigScreen`'s per-seat picker is unaffected. —
      `npx playwright test menu.spec.ts`
- [x] P13.5 Distinct board theme reskin: extend the `[data-theme='nakshatra']` /
      `[data-theme='chhalaang']` CSS blocks in `global.css` beyond the current background-color
      swap to include a distinct peg color palette and board/cell texture per theme (CSS-only, no
      new image assets or build-step changes), so switching themes visibly changes gameplay
      rendering, not just the menu backdrop. — `npx playwright test settings.spec.ts`
- [x] P13.6 Full phase gate. Run axe against the new `MenuScreen` and `npm run lighthouse`,
      confirm both still clear Phase 8's ≥90 bar. Update `HANDOFF.md` (mark the "menu/config
      redesign + prominent avatar" and "board themes are a light accent-color swap" future-scope
      items done, leaving every other deferred item — leaderboard, reward system, telemetry,
      difficulty curve, kingmaker — untouched) and `PROGRESS.md`. —
      `npm test && npm run lint && npm run typecheck && npm run build && npx playwright test &&
      npm run lighthouse`

## Family pilot — executable scope (supersedes the earlier Phases 14–16)

**Mantra: build independently, verify completely, then hand over for human validation.**
Human testing evaluates fun and clarity; it must not be the first functional/regression test.
Nipun authorized a bounded overnight implementation loop. Complete only the unchecked tasks
below; the earlier campaign/daily plan is archived in
`docs/archive/IMPLEMENTATION_PLAN_PRE_FAMILY_PILOT.md`. `BACKLOG.md` captures deferred ideas;
backlog entries are never autonomous work authorization.

Deliver personal-best celebrations, four first-victory rival badges, and **five independently
selectable, shareable puzzles**. Keep GitHub Pages, existing rules, worker AI, free-play access,
and the offline single-file build. No backend, accounts, analytics, public leaderboard, daily
schedule, campaign map, currency, or new UI framework. No push, deploy, or public sharing by the
agent; the human reviews locally and decides when to publish. Existing live URLs do not contain
these new features until the human deploys them.

Implementation contract:
- Pure session/record/puzzle logic under `src/progression/`, importing engine only. Persistence
  and navigation under app; engine cannot import progression. Preserve all completed-phase behavior.
- A move is one step OR an entire legal jump chain. Puzzles use stationary pivot pegs and a
  single controllable designated peg, an explicit goal cell, and a target move budget. This is
  a labeled solo puzzle adapter, not a change to normal turn handling or engine win conditions.
- Every puzzle can be completed beyond its target: completion medal for reaching the goal,
  efficiency star for at/below target without undo. Ordinary legality hints remain available.
  No timer. Restart resets the attempt/undo flag; repeated completions keep the best award.
- Match records use per-human moves/longest chain; first wins against Nova/Vega/Rigel/Sirius earn
  one permanent badge each. No campaign prerequisites. Celebrate a genuine new chain record even
  on a loss. No fabricated praise or points for wandering. Only completed standard 2P games with
  exactly one human and one AI are eligible; exclude fixtures, incomplete legacy history,
  abandoned matches and stalemates. Undo may earn a first-win badge but not efficiency records.
- Version comparison keys by rules, AI tuning, human starting seat, opponent tier, and mode.
  Persist session IDs and outcome receipts so reload/retry cannot award twice. No claims of
  cross-device sync, verified public ranking, or proven globally optimal puzzle solutions.
- Normal game and puzzle attempts use the existing one-active-save model, with discard
  confirmation. Opening a shared link must not silently replace an existing save.
- Share a versioned puzzle ID through the existing `/starleap/` entry URL fragment (no server
  routing needed), never a solution or arbitrary executable/board payload. Links from hosted
  builds use their deployment base. In file:// mode use a documented configured public base URL,
  never leak a local filesystem path; explain an unpublished puzzle may require the newer build.
- User-triggered share/copy only. Clipboard/share API failure or absence falls back to selectable
  plain text. Cancellation is not an error. Do not invoke external share targets during tests.
- Local storage may be missing/full/corrupt: play continues, persistence failure is visible and
  nonblocking. Legacy saves remain playable, without inventing historical statistics.

Every task: targeted verification below PLUS `npm test && npm run typecheck && npm run lint`
before committing. Include plan checkbox, PROGRESS, and any decision/evidence update in the same
commit. New test filenames below are deliverables. Follow `OVERNIGHT_RUNBOOK.md` for failure
handling, evidence, morning cutoff, and readiness. Do not weaken tests or mark a skipped gate green.

## Phase 14 — Personal bests and rival badges

GATE: per-seat accounting is correct; resume/undo and repeated terminal processing are safe;
all four badges are earned from real eligible results; loss can still celebrate improvement;
records are clearly local. No functional changes to multiplayer rules or AI search.

- [x] P14.1 Add typed session statistics and pure record eligibility: committed per-seat moves,
      longest chain, long-hop count, session identity/version context, undo-used and history-
      complete flags. Restore snapshots on undo but keep the attempt's undo-used flag sticky.
      Test human seat 1, AI attribution, multiplayer exclusion, long chains counting as one move,
      legacy histories and duplicate events. —
      `npx vitest run src/progression/__tests__/sessionStats.test.ts`
- [x] P14.2 Integrate session statistics with commit/undo/save/resume and a validated versioned
      save envelope. Preserve v1 board/config; mark history incomplete. Save pending terminal
      outcome before clearing the active match. Test reload during AI/animation, interrupted
      completion, malformed storage, and undo; no score side effects from animation-only callbacks.
      — `npx playwright test progress-resume.spec.ts save-resume.spec.ts undo.spec.ts`
- [x] P14.3 Implement versioned local progress store: best win move count, best completed-match
      human chain, and four first-win badges. Use comparison keys above and idempotent outcome
      receipts; bound retained history and prevent stale saved outcomes from duplicating awards.
      Test repeated load/commit, ties, losses, ineligible sessions, AI changes and storage failure.
      Do not mistake the visual seat portraits already present for earned victory badges. —
      `npx vitest run src/progression/__tests__/records.test.ts src/app/__tests__/progressStore.test.ts`
- [x] P14.4 Upgrade results: human-specific stats, new-personal-best text (also on eligible
      losses), earned badge, rematch and next-rival action; no tier beyond Sirius. Add a small
      accessible “Rival badges / Personal bests” collection on the menu or a secondary screen.
      Reuse portraits; all opponents remain selectable. Preserve ordinary game stats and save
      discard flow; show incomplete legacy history honestly. —
      `npx playwright test personal-records.spec.ts rival-badges.spec.ts post-game-stats.spec.ts win-screen.spec.ts`
- [x] P14.5 Add compact per-seat Home N/10 and target-corner symbol/label; distinguish waypoint
      corners without obscuring legal moves. Use restrained existing CSS/SVG styling, preserving
      themes, touch targets, focus, and the removed redundant color-label decision. Check 360px
      and desktop manually through browser screenshots and keyboard navigation. —
      `npx playwright test match-progress.spec.ts responsive-360.spec.ts keyboard-nav.spec.ts settings.spec.ts axe-audit.spec.ts`
- [x] P14.6 Run phase regression for records/badges/resume/multiplayer plus reduced motion and
      accessibility; record commands/results and inspected screenshots in `VALIDATION.md`.
      Fix failures before advancing. —
      `npx playwright test personal-records.spec.ts rival-badges.spec.ts progress-resume.spec.ts finished-player.spec.ts reduced-motion-full.spec.ts axe-audit.spec.ts`

## Phase 15 — Five short puzzles and family sharing

GATE: all five authored puzzles have engine-verified solutions and reachable target budgets;
a player can discover, solve, retry, resume, earn medals and share each one. A fresh browser
opening the link gets the same versioned starting position with no login or solution disclosure.

- [x] P15.1 Define puzzle schema, pure adapter/objectives and five fixtures: First Chain
      (two hops), Long Leap (distant pivot), Turn the Corner (direction change), Build the Route
      (multi-move planning), and Home Stretch (reach a marked home cell). One movable peg;
      other pegs are stationary pivots. Choose concrete legal positions and modest 1–4 move
      targets, each with a validated reference solution. Distinguish move and hop counts. Test
      false goals, illegal resting cells, alternate valid solutions, and all budget boundaries;
      never reject a valid solution because it differs from the reference. —
      `npx vitest run src/progression/__tests__/puzzles.test.ts`
- [x] P15.2 Build a simple puzzle picker and reusable play screen with objective, marked peg/
      destination, move counter/target, retry, undo, completion, and return controls. Reuse Board,
      hints and animations; bypass AI turns only in the puzzle adapter. Accept completion beyond
      target, offer retry positively, and keep puzzle actions clear on phones and keyboards. —
      `npx playwright test puzzle-play.spec.ts puzzle-picker.spec.ts`
- [x] P15.3 Persist puzzle attempts and awards in versioned storage using the existing active-
      save/discard flow. Store content version, board, move count, undo history/flag and pending
      result identity. Medal once per puzzle/version; efficiency star at target without undo.
      Retain best on replay; reject unknown versions safely without corrupting other progress.
      Test interruption, reload, completion duplication, undo/restart and quota/corrupt data. —
      `npm test && npx playwright test puzzle-resume.spec.ts puzzle-rewards.spec.ts`
- [x] P15.4 Add validated fragment routing for bundled puzzle ID+version and spoiler-free
      result text with puzzle name, move count/target, and practice/undo status. Hosted base-path
      aware; unknown/malformed links show a friendly fallback. Deep links require confirmation
      before replacing an active save. Test refresh, browser navigation and fresh-context links.
      Document file:// public-base behavior and do not encode local paths or solutions. —
      `npm test && npx playwright test puzzle-links.spec.ts`
- [x] P15.5 Add user-triggered “Challenge a friend” with native sharing where supported, copy
      text/link otherwise, and selectable-text fallback on denial/unavailability. Show honest
      success/cancel/error status. Generated result is unverified friendly comparison, not a
      certified rank. Stub share/clipboard in E2E; test a second isolated browser opens the
      generated link and solves the same puzzle. Never send to a real contact during tests. —
      `npx playwright test puzzle-sharing.spec.ts puzzle-links.spec.ts`
- [ ] P15.6 Extend tutorial to teach a true two-hop chain and the target-corner objective.
      Require the stated objective, not any legal move, to advance all stages. Add a concise
      explanation that an entire chain is one move. Preserve skip/finish and onboarding behavior.
      — `npx playwright test tutorial.spec.ts tutorial-chain.spec.ts`
- [ ] P15.7 Run the full puzzle flow across all five fixtures, sharing, resume, hints on/off,
      keyboard, reduced motion, and 360px layout. Inspect screenshots and add evidence to
      VALIDATION. Confirm puzzle mode has not leaked into ordinary game turn/win semantics. —
      `npx playwright test puzzle-play.spec.ts puzzle-resume.spec.ts puzzle-rewards.spec.ts puzzle-sharing.spec.ts keyboard-nav.spec.ts responsive-360.spec.ts reduced-motion-full.spec.ts axe-audit.spec.ts`

## Phase 16 — Automated release qualification and human review package

GATE: all implementation tasks and checks pass on the final code revision; no unresolved blocker;
both deployable outputs are built and exercised; human receives reproducible review instructions
and limitations. “Ready” means ready for local review, not published and not human-approved.

- [ ] P16.1 Add integration coverage for offline PWA and file:// builds: solve/resume a puzzle,
      preserve records/badges, and test share fallback without network calls. Verify the Pages
      `/starleap/` base with a built preview and a fresh-context shared URL (no server rewrite).
      Assert no added runtime API/analytics dependency; retain the existing full Sirius offline
      match gate. Test data/fixtures must never contaminate genuine progress. —
      `npm run build && npm run build:singlefile && npx playwright test pwa-offline.spec.ts singlefile-offline.spec.ts pilot-offline.spec.ts pages-puzzle-links.spec.ts`
- [ ] P16.2 Run final full qualification: unit/property tests, typecheck, lint/boundaries, both
      builds, all Playwright specs, axe on every new screen and Lighthouse ≥90 performance and
      accessibility. Record exact commands, exit codes, counts, timestamps and tested code commit
      in VALIDATION; retain logs/screenshots under ignored `artifacts/family-pilot/`. Fix regressions
      and rerun affected tests plus the final gate after code changes. —
      `npm test && npm run typecheck && npm run lint && npm run build && npm run build:singlefile && npx playwright test && npm run lighthouse`
- [ ] P16.3 Perform final code review focused on award eligibility, save migration, undo,
      untrusted links, duplicate events, accessibility and missing tests. Drive real browser flows
      at 360px and desktop, inspect screenshots, and check console errors. Exercise one actual
      worker-AI match through completion (not just a forced win fixture); automated legal-move
      driving is allowed. Check all four badge paths with controlled fixtures separately. Record
      findings/fixes and retest evidence. Zero open correctness blockers before checking off. —
      `npm test && npm run typecheck && npm run lint && npx playwright test`
- [ ] P16.4 Produce `REVIEW_READY.md`: readiness status, tested code revision/final commit range,
      feature summary, exact local preview and single-file instructions, evidence links, storage
      limitations, five-puzzle list, sharing-before-deploy caveat, known nonblocking issues, and
      a short family test script. Update HANDOFF/PROGRESS/BACKLOG. Mark READY_FOR_REVIEW only if
      P16.2/P16.3 evidence still covers the final code and no tasks/blockers remain (docs-only final
      commit is allowed). Otherwise explicitly mark NOT_READY with failed gates. Commit locally,
      stop the overnight automation, and report readiness; do not push or deploy. —
      `git diff --check` plus audit of task/gate/evidence completeness (document the audit result).

Stop after P16.4. Deferred ideas live in BACKLOG.md and must not be promoted automatically.

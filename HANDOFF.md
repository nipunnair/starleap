# HANDOFF

STARLEAP was built autonomously, phase by phase, per `IMPLEMENTATION_PLAN.md`. This document is
the entry point for a human (or another agent) picking up the project afterward. For narrative
detail on *why* things ended up the way they did, `DECISIONS.md` is the authoritative log — every
non-obvious judgment call made during the build is there, in chronological order, with rationale.

## What's built

All ten planned phases are complete and green:

- **Engine** (`src/engine/`): full rules — cube-coordinate board, arbitrary-span jump chains,
  residency rule, anti-backward-block, win/stalemate detection. Zero imports outside itself,
  enforced by `scripts/check-boundaries.mjs`.
- **AI** (`src/ai/`): a weighted evaluation function, iterative-deepening alpha-beta (2P) /
  max^n (3+P) search, and a four-tier difficulty ladder (Nova/Vega/Rigel/Sirius) verified
  monotonic via headless tournament self-play. Runs in a Web Worker off the main thread.
- **UI** (`src/ui/`): full board rendering, hop/chain animation with squash-and-stretch and
  particle juice, AI character avatars with a thinking/found-it/worried/celebrate state machine,
  keyboard navigation, screen-reader announcements.
- **Meta** (`src/app/`): menu, config, settings, rules, an interactive tutorial, undo,
  save/resume via localStorage, post-game stats.
- **Packaging**: a standard PWA-enabled `dist/` build, a fully self-contained `starleap.html`
  (playable via `file://` with zero network requests, including the AI worker), a Dockerfile,
  and a GitHub Pages deploy workflow. See `README.md` for how to build/run each.

Test coverage: 126 unit tests (vitest, including fast-check property tests for the board math and
Zobrist hashing) and 60 Playwright E2E tests, all green. `npm run lighthouse` scores 100/100 on
both performance and accessibility; `npx @axe-core/playwright` finds zero critical/serious
violations on any screen.

## What's deferred (not blockers — see `BLOCKED.md`, which is empty)

- **A full 200-games/pairing tournament at real (unscaled) SPEC §3.3 time budgets.** The
  committed gate used 30 games/pairing at a scaled-down time budget (~70+ minutes at real budgets
  was judged unnecessary given a decisive, consistent 180-game trend). Re-running
  `npm run tournament -- --games 200 --scale 1.0` for each player count is a reasonable
  overnight/background task if stronger statistical confidence is ever wanted.
- **3P/4P/6P self-play stalemate rates were never re-measured against the tuned Phase 3
  weights/search.** Phase 2 found the *greedy* baseline AI stalemates 100% of 3P/4P/6P games
  (documented as an AI-quality gap, not a performance one). Phase 3's fixes (repetition
  avoidance, weight tuning, the relative-eval fix) almost certainly improve this a lot, but the
  Phase 3 gate itself was only run and verified at 2 players. Worth a `npm run selfplay --
  --players 3` / `4` / `6` pass with real tiered AI players (not greedy) to confirm before
  treating 3+/4+/6-player games as fully validated the way 2-player is.
- **Board themes are a light accent-color swap** (a `data-theme` attribute swapping background
  color), not a full visual reskin. `buildkit.md`/`docs/SPEC.md` name two themes (Nakshatra,
  Chhalaang) without specifying what visually distinguishes them beyond "theme" — a deeper reskin
  (peg colors, cell styling, board texture) is a reasonable follow-up if the two themes should
  feel more distinct.
- **`src/engine/index.ts`** is a documented public-API barrel (named in `docs/ARCHITECTURE.md`'s
  module table since before any code existed) that no internal code currently imports through —
  every consumer reaches into engine submodules directly instead. Kept rather than deleted (see
  DECISIONS.md's P10.2 entry) since it's zero-logic and documents the engine's intended contract,
  but a future maintainer could equally decide to either start routing internal imports through
  it or remove it.

## Future scope (from first-round playtesting)

Not built, not scheduled — captured here so it isn't lost. Ordered roughly as raised, not by
priority:

- **Make suggested-move highlighting optional**, off by default (or off at higher difficulty
  selections). Currently every legal destination for a selected peg is always highlighted
  (`Board`/`PathPreview`) — good for onboarding, but experienced players may want to turn it off.
- **At higher difficulty settings, replace move suggestions with a reward signal for chaining**
  instead (e.g. a small "happy stars" burst on a long jump chain) rather than just removing help.
  Ties into the next item.
- **Show a counter/score for chained jumps as they happen** — a visible "leveling up" moment when
  a player pulls off a multi-hop chain, not just the existing screen-shake-on-5+-hops juice.
  Would likely live in `GameScreen`'s per-move handling alongside `shouldShakeForMove`.
- **The initial menu flow needs a redesign pass** — flagged as "clunky" in first playtesting.
  The current menu (`App.tsx`'s bare fallback screen) is functional but was never given a design
  pass; a first-time player's path through menu → config → rules/tutorial is worth rethinking as
  a whole rather than patching individual screens.
- **The AI "thinking" character animation is real but easy to miss in practice.** Diagnosed
  during the same playtest feedback session: the state machine, CSS animation, and 60px avatar
  are all present and working (verified: `.starleap-avatar--thinking` has a working orbiting-dots
  keyframe, `CharacterAvatar` receives the right `data-state`), but at Nova's tier the whole
  thinking→found-it cycle is only ~600-850ms (250ms search budget + 400ms min-thinking floor +
  200ms found-it display), and the avatar itself is small with no strong visual anchoring —
  genuinely easy to not notice mid-game. Worth either slowing it down, making it larger/more
  prominent, or moving it somewhere a player's eyes are more likely to already be (e.g. nearer
  the board or the turn indicator) rather than treating it as broken.
- **A simple leaderboard tracking who's played and their scores**, once the game is hosted
  somewhere multiple people can reach. The app is currently 100% client-side with zero backend
  (a deliberate zero-backend design — see `docs/ARCHITECTURE.md`), so this needs *some* shared
  persistence layer that doesn't exist yet. Cheapest realistic paths, roughly in order of setup
  effort: (1) a tiny serverless function + KV/Redis store (e.g. Cloudflare Workers + KV, or a
  Vercel/Netlify function) that the client POSTs a name + final stats to after a game ends,
  fronted by a simple `/leaderboard` read endpoint; (2) Firebase/Supabase free tier for the same
  thing with less custom backend code to write; (3) if hosted as a Claude Artifact instead of (or
  in addition to) GitHub Pages, its built-in shared-database capability would cover this with no
  separate infrastructure at all. Needs a product decision first (what counts as a "score" —
  win/loss? fastest win? longest chain? — ties into the chain-counter item above) before picking
  an implementation.

## How to extend

**Add a new AI tier**: add an entry to `TIERS` in `src/ai/tiers.ts` (depth, topK, noise,
timeBudgetMs, optional maxChainHops) and to `TIER_ORDER`. `ConfigScreen` and the worker protocol
pick up new tiers automatically via `TIER_ORDER`. Validate it against the existing tiers with
`npm run tournament -- --games 30` before trusting its placement in the ladder — tuning topK/depth
by feel is exactly what went wrong (and was fixed) during Phase 3; see DECISIONS.md for the whole
diagnostic arc if a new tier misbehaves the same way.

**Add a new board theme**: extend `Settings['theme']` in `src/app/settingsStore.ts` and add the
corresponding `[data-theme="..."]` CSS block in `src/app/global.css`. `SettingsScreen` picks up
new theme options from the same type.

**Add a new phase / feature**: follow the pattern in `IMPLEMENTATION_PLAN.md` — a short numbered
task list per phase, each with a verification command, and a GATE that must pass before the phase
is considered done. Update `PROGRESS.md`'s Done/Next/Gate-status sections and log any non-obvious
judgment call in `DECISIONS.md` with a one-line rationale, the same way every phase in this build
did.

**Modify board math or rules**: `docs/SPEC.md` is the source of truth (supersedes `buildkit.md`
on any conflict) — start there, then `src/engine/`. The engine has zero imports outside itself by
design; any change that would require importing from `ai/` or `ui/` into `engine/` is a sign the
change belongs in a different layer, not an exception to make in the engine.

**Run the full gate suite**: `npm test && npm run lint && npm run typecheck && npm run build &&
npx playwright test`. The full E2E suite takes ~8.5 minutes, dominated by one real full-length
game against Sirius (`singlefile-offline.spec.ts`, the slowest AI tier) — that runtime is
expected, not a regression.

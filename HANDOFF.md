# HANDOFF

STARLEAP was built autonomously, phase by phase, per `IMPLEMENTATION_PLAN.md`. This document is
the entry point for a human (or another agent) picking up the project afterward. For narrative
detail on *why* things ended up the way they did, `DECISIONS.md` is the authoritative log — every
non-obvious judgment call made during the build is there, in chronological order, with rationale.

## What's built

All twelve planned phases are complete and green:

- **Engine** (`src/engine/`): full rules — cube-coordinate board, arbitrary-span jump chains,
  residency rule (by default, unclaimed corners in <6P games are waypoints only — see
  `cordonNeutralCorners`, Phase 12), anti-backward-block, win/stalemate detection. Zero imports
  outside itself, enforced by `scripts/check-boundaries.mjs`.
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

## Future scope (first-round playtesting + a 4-reviewer LLM council pass)

Not built, not scheduled — captured here so it isn't lost. First-round playtesting raised six
items (suggested-move visibility, chain rewards, a chain counter, a menu redesign, the thinking
animation, and a leaderboard). Those went through an independent 4-reviewer critique pass (a
Game Designer, a UX/onboarding reviewer, a Technical Architect, and a QA/edge-case reviewer, each
reading the code cold with no shared framing) before anything was built. What follows is that
critique folded in, organized by confidence level rather than by who raised it first.

### Confirmed bugs (verified in code, not opinion)

- **[Done — P11.1]** ~~Nothing tells a human player which peg color is theirs.~~ Found in second-round playtesting:
  a player assumed the blue pegs were "them" and it was the opposite. Confirmed in code —
  `PLAYER_COLORS` in `src/ui/components/boardGeometry.ts` assigns colors purely by seat index
  (`0` = red, `1` = blue, ...) and the human is always seat 0 (red) in "Play vs Nova," but there
  is no legend, no "You are red" label, and no color-coded self-identification anywhere in
  `ConfigScreen` or `GameScreen` — grepped for it, genuinely absent. Likely the single highest-
  value, lowest-effort fix on this whole list: a color swatch next to "you" on the turn indicator
  or config screen would resolve it outright.
- **The AI "thinking" animation is real, working, and easy to miss** — not broken. The state
  machine, CSS keyframes, and avatar (`CharacterAvatar.tsx`) all fire correctly and pass their
  tests, but at Nova's tier the whole thinking→found-it cycle is only ~600-850ms (250ms search
  budget + 400ms min-thinking floor + 200ms found-it display) and the avatar is a small,
  subtly-animated 64px icon with no strong visual anchoring.

### Consensus recommendations (converged independently across 3-4 reviewers)

- **Don't build a shared/public leaderboard yet — ship a local one first.** Three of four
  reviewers converged on this without prompting each other. The Architect's core objection: a
  client-only game can't verify a client-reported score without shipping the engine to a second
  runtime for server-side replay, which undermines the "one codebase, several build targets"
  design this project deliberately protects. QA adds the concrete abuse case (devtools-edited
  scores, name-squatting, no auth). Game Designer's counter-offer: a localStorage personal-best/
  streak table keyed by (tier, player count) gets most of the motivational value for zero infra.
  **If a shared version is ever built**, the Architect's ranked take: Cloudflare Workers + KV
  over Firebase/Supabase (less to babysit) or an Artifact DB (forks the distribution story this
  project worked to keep unified across dist/starleap.html/Docker) — no free-text names (use
  generated handles, sidesteps privacy/moderation entirely), rate-limited, TTL'd, top-100 only.
- **The menu/config redesign is real, but sequence it after gameplay-feel work, and mind the
  blast radius.** UX gave the sharpest diagnosis: flat, equal-weight buttons with no hierarchy;
  zero-indexed "Player 0"/"Player 1" seat labels that read as a debug artifact; tier names (Nova/
  Vega/Rigel/Sirius) with no in-context explanation; `startNewGame` silently wipes an in-progress
  save via `clearSavedGame()` with no confirmation. Game Designer agrees it matters but ranks it
  below core-loop items — first impressions hurt retention, but they don't define whether the
  game is fun once you're in it. QA's caution: existing E2E specs are pinned to current menu
  selectors, and nothing currently asserts *intended* defaults (only current ones), so a redesign
  could silently change what a new player sees first without anyone noticing.
- **[Toggle done — P11.4; the reward-system replacement below remains deferred.]** Separate the
  "hint toggle" from "replace hints with a chain-reward system" — they are two
  differently-sized features. The Architect explicitly scoped their pick to "toggle only, not
  the reward-replacement." The reason: `PathPreview` currently does double duty as both the
  onboarding hint *and* the legality-signaling affordance that the keyboard-navigation and
  screen-reader-announcer work (Phase 8) already assumes exists. Removing it isn't a settings
  toggle, it's an interaction redesign that touches accessibility work already gated and shipped.
  QA separately flags that "difficulty" itself is ambiguous once you're in a multiplayer
  pass-and-play game with a different AI tier seated at each corner — resolve what "difficulty"
  means (the human's own preference vs. whichever AI tier happens to be next) before building
  either the toggle or the reward system.
- **[Basic per-move counter done — P11.7; the score/leaderboard semantics below remain
  deferred.]** The chain counter is well-liked but needs two decisions made before it's built. Game
  Designer's #1 pick overall — "the long-jump chain is STARLEAP's entire differentiator; right
  now the only feedback is screen-shake at 5+ hops." But QA flags it's premised on "score"
  semantics HANDOFF itself hasn't defined yet (per-hop/per-turn/per-game reset boundary; correct
  attribution to the right seat in pass-and-play), and needs a non-particle equivalent for
  reduced-motion players (SPEC §4.8 disables particle effects entirely under that setting, so as
  specified, reduced-motion players would get no reward signal at all under the reward-system
  version of this idea).

### One real disagreement (worth a decision, not a default)

- **[Done — P11.6, per the 2-of-3 lean below: size/position/labeling fixed, duration
  unchanged.]** The thinking-animation fix: UX's suggestion is bigger + a text label + a slower cycle so it
  has time to register. Game Designer disagrees specifically with "slower" — Nova's speed is its
  personality, and stretching it fights that identity for no gameplay reason. QA independently
  arrives at the same objection from a different angle: the ~400ms floor already exists
  specifically so fast tiers don't read as broken, and any further slowdown raises perceived
  latency on every Nova/Vega turn. **2-of-3 lean: fix size, position, and labeling; leave
  duration alone.** Either way, per QA, any prominence fix needs a static-pose reduced-motion
  equivalent (SPEC §4.8) rather than leaning on more motion to be noticeable.

### New ideas the council surfaced (not in the original six)

- **Anonymous telemetry** (Architect's other top-3 pick) — arguably the single highest-value new
  idea. Right now there is zero visibility into whether anyone plays, which tier they pick, or
  whether 3P/4P/6P games actually stalemate in real play (an already-open validation gap — see
  "What's deferred" above). One fire-and-forget event (tier, player count, result, move count,
  duration) on the same endpoint a future leaderboard would need anyway, with a far cleaner
  privacy story than a leaderboard.
- **A human-calibrated difficulty curve.** The Nova→Sirius ladder is validated by AI-vs-AI win
  rate (SPEC §3.3's ≥60% monotonic gate), which says nothing about how a *human* perceives the
  jump between tiers — that's exactly the kind of gap that can read as a difficulty cliff to a
  person even when it's statistically clean between bots.
- **Comeback mechanics / kingmaker risk, especially at 3-6 players.** Not discussed anywhere in
  SPEC today: the eval function's ladder/spread terms reward early strong formations with no
  stated anti-snowball design, and in 3+ player games a losing player's move choice can decide
  which of two leaders wins (kingmaker risk) with no mitigation considered.
- **[Done — P11.2]** ~~Confirm-before-discard when starting "New Game" while a save exists~~ —
  small effort, and the current silent overwrite is a real (if currently undiscovered) data-loss
  risk.
- **[Done — P11.5]** ~~First-launch detection to promote the Tutorial~~ for brand-new players,
  rather than treating first-time and returning players identically.
- **[Done — P11.3]** ~~Inline tier tooltips in `ConfigScreen`~~ explaining what Nova/Vega/Rigel/
  Sirius mean, instead of requiring a detour to Rules.
- **Version-stamp any future remote/shared record against the ruleset/build version.** The moment
  anything persists off-device, tier parameters and score definitions become a public contract —
  retuning Sirius later would silently invalidate every historical record otherwise. Mirrors the
  versioned-key pattern `persistence.ts` already uses for local saves (`starleap.save.v1`); cheap
  to do now, not retroactively.
- **Save/resume interaction with settings changes is undefined.** If hint visibility or a
  chain-reward toggle changes between saving and resuming a game (plausible given how long a game
  can run under the 150-round cap), there's no defined behavior for which setting a resumed game
  honors — a plausible source of confusing bug reports later.

### Reviewers' top-3 picks, for reference

| | #1 | #2 | #3 |
|---|---|---|---|
| Game Designer | Chain counter/reward | Human-calibrated difficulty curve | Comeback/kingmaker investigation |
| UX | Menu/config redesign | Thinking-animation fix (size/position/label) | Confirm-before-discard |
| Technical Architect | Menu redesign + prominent avatar | Hint toggle (scoped to *just* the toggle) | Anonymous telemetry |
| QA (framed as "resolve before shipping") | Leaderboard integrity model | Define "difficulty" unambiguously | Reduced-motion parity for any animation/reward change |

Nothing above is scheduled. It's a menu to choose from, not a plan.

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

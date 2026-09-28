# STARLEAP — Scoring & Gamification: Design Plan

**Status: design only, nothing built.** Commissioned 2026-09-27, ahead of a first public release,
to resolve exactly what `HANDOFF.md`'s "Future scope" section left open: a chain-reward/scoring
system and (new, this pass) single-player "challenge" discovery mechanics. Nothing here is
scheduled into `IMPLEMENTATION_PLAN.md` yet — that file only ever gets a new phase when a human
decides to schedule one (see AGENTS.md's scope guardrail). This document is that decision's input,
not the decision itself.

## How this was produced

`HANDOFF.md` already ran a 4-reviewer critique (Game Designer, UX, Technical Architect, QA) over
the original six playtesting ideas and left three of them explicitly unresolved pending "real
design work": the chain-reward system, leaderboard integrity, and what "difficulty" even means in
a multiplayer seating. This document picks those up rather than re-opening them from scratch, adds
the two things asked for this round (a live scoring mechanism, single-player discovery
"challenges"), and runs the same four lenses over the combined result — plus a fifth, since the
explicit trigger this time is "before we publish it": **Publishing Readiness**. Where the earlier
council already reached consensus (e.g. local-only leaderboard, not shared), this document affirms
and makes it concrete rather than re-litigating it.

I did not spawn sub-agents for this — the four/five "voices" below are lenses I reasoned through
directly, not independent LLM instances. If a truly independent second opinion is wanted before
committing engineering time, `/code-review ultra` or the `guru-architect` agent are the right
tools for that, not something to fabricate here.

## Grounding: what already exists (nothing below invents around this)

- **A trusted, tested per-seat quality signal already exists twice over, at two different
  grains.** `engine/terminal.ts`'s `rank()` (pegs home, descending; summed distance-to-target,
  ascending) is the exact function already used for stalemate ranking and the finished-game
  standings — reusable wholesale as a live score's foundation, not a new invention.
  `ai/eval.ts`'s `evaluate()` is a richer, weight-tuned heuristic, but it's the AI's *own private
  judgment* — retuned by hand during Phase 3 to fix specific AI pathologies, not designed to be
  human-legible, and never meant to be shown to a player (see Part A below for why it stays that
  way).
- **The chain mechanic already has two tested significance thresholds on record**: a chain badge
  fires at `hopCount >= 2` (P11.7), a board shake at `hopCount >= 5`
  (`SHAKE_HOP_THRESHOLD`, `chainAnimation.ts`). Any new "this chain is notable" threshold should
  sit relative to these, not invent an unrelated number.
- **`Hop.span`** (`engine/moves.ts`) already records, per hop, how far the pivot was — `span > 1`
  is precisely STARLEAP's own signature rule (hopping a pivot that isn't adjacent, the thing that
  makes this game not classic Chinese Checkers). This is sitting right there as the natural
  definition of a "creative" chain, already computed, already tested.
- **`showMoveHints` (`PathPreview`) is accessibility-load-bearing, not just a beginner aid.**
  HANDOFF.md's Architect flagged this and it's still true: destination highlighting is what the
  keyboard-navigation focus ring and the screen-reader announcer's affordances lean on. Anything
  built here must be *additive* to that, never a replacement — this was already the prior
  council's explicit conclusion and this plan doesn't reopen it.
- **Reduced motion (SPEC §4.8) disables particle effects entirely.** The prior council flagged
  that a particle-only chain reward would leave reduced-motion players with zero feedback. Any
  reward signal designed here must have a text/static equivalent as the primary channel, not an
  afterthought bolted on.
- **Persistence already has a real versioning precedent**: `starleap.save.v1`
  (`app/persistence.ts`), `starleap.settings.v1` (`settingsStore.ts`). Anything new that persists
  gets its own versioned key, per HANDOFF's own explicit warning about silently invalidating
  historical records if tier weights are retuned later.
- **All 13 phases in `IMPLEMENTATION_PLAN.md` are green, nothing unchecked.** This is genuinely
  new scope, not a gap in existing work.

## North star (the thing every decision below has to answer to)

STARLEAP's own Game Designer reviewer already named the differentiator on record: *"the long-jump
chain is STARLEAP's entire differentiator; right now the only feedback is screen-shake at 5+
hops."* Scoring and gamification exist here for one job: **make players notice and go looking for
good chains** — not to bolt a generic points economy onto a game that already has a clean win
condition. Anything proposed below that doesn't serve that job is scope creep and should be cut,
including by the human reading this, not just by me.

---

## Part A — A scoring mechanism

### What the score is (and deliberately isn't)

**Don't show `evaluate()`'s number.** It's tempting — it's already computed, already per-player —
but showing it live would (a) hand the human a permanent, unearned "am I ahead or behind" readout
that undercuts the exact discovery/challenge design in Part B, and (b) tie a player-facing number
to internal weights that get hand-tuned whenever an AI pathology is found (as `DEFAULT_WEIGHTS`'
own comment describes happening during Phase 3) — silently changing what a score *means* between
sessions, which is precisely the version-drift risk HANDOFF.md warned about for persisted records.

**Build the score from primitives a player can verify by looking at the board**, the same
transparent-rules ethos the rest of SPEC.md already has:

| Component | Source | Rationale |
|---|---|---|
| Progress | pegs home, summed distance-to-target-apex | Literally `rank()`'s own two fields, already trusted, already tested |
| Chain bonus | hop count of the move just played, on a curve | Directly serves the north star — the bigger/more creative the chain, the more it's worth |
| Creative-chain multiplier | count of hops in the move with `span > 1` | Rewards *using* STARLEAP's signature mechanic, not just chaining through adjacent pegs |

Proposed shape (illustrative, not final — see "Open decisions" for what's actually a product
call):

```
turnScore = (pegsHomeDelta * K_HOME) + (distanceProgressDelta * K_PROGRESS)
          + (hopCount >= 2 ? BASE_CHAIN_BONUS + hopCount * K_HOP : 0)
          + (longHopCount * K_LONG_HOP)   // hops where span > 1
```

Cumulative game score is a running sum, reset at game start. Explicitly **not** eval-based, so
retuning an AI tier later can never silently change what a past game's score meant.

### Where it lives (architecture)

A new pure module, **`src/engine/scoring.ts`** — engine-layer, zero imports beyond `state.ts`/
`terminal.ts`/`moves.ts`, exactly like every other engine module. Not `ai/`: this keeps scoring
permanently decoupled from AI weight tuning (the version-drift concern above), and keeps it
callable from a self-play/headless context later (e.g. if a future telemetry pass wants
score distributions) without pulling in the AI layer. A pure function
`scoreForMove(before: GameState, after: GameState, move: Move, owner: number): number`, called
once per committed move, same call shape as `applyMove` — fits the existing pipeline in
`GameScreen.handleMoveAnimationComplete` with no new async boundary, no worker involvement.

### Where it's shown

Reuse `SeatBadges` — already the per-seat identity anchor built for the avatar work — rather than
inventing a new HUD element. A small numeric chip near each badge, text only (reduced-motion safe
by construction, resolving the exact gap the prior council flagged for the chain-reward idea).
Updates once per committed move, attributed to `move`'s actual `owner` — this is what resolves
QA's flagged "correct attribution in pass-and-play" concern: because the score is computed
per-seat off `GameState` the same way `rank()` already is, there's no owner-guessing logic to get
wrong, unlike a hand-rolled HUD that has to be told whose turn it was.

### Persistence and the leaderboard question

The **live** score is fully derived from `GameState` every render — nothing new to persist,
nothing new to version, and it resolves HANDOFF's flagged "undefined behavior if a setting
changes between save and resume" concern for free: there's no setting involved, just
recomputation.

**A local personal-best table is a separable, optional addition**, not a requirement of the
scoring mechanism itself. If built: own versioned key (`starleap.bests.v1`, distinct from
`starleap.save.v1`), keyed by **`(tier, playerCount)`** — never a single global high score. This
directly resolves QA's difficulty-ambiguity flag: beating Nova at 2P and beating Sirius at 6P are
not comparable achievements, and a single leaderboard number would imply they are. This also
affirms, rather than reopens, the prior council's already-converged 3-of-4 consensus: **no
shared/public leaderboard** — a client can't have its reported score verified without shipping the
engine to a second runtime for replay, which breaks the "one codebase, several build targets"
design this project has protected through 13 phases. If a shared version is ever wanted, the
Architect's prior ranked take stands (Cloudflare Workers + KV over Firebase/Supabase, generated
handles not free-text names, rate-limited, top-100 only) — restating it here for continuity, not
re-deciding it.

---

## Part B — Single-player challenge / discovery gamification

This is the part of the ask that's genuinely new (not previously discussed in HANDOFF.md), and
the part most likely to go wrong if built as "just add hints, but coy about it." The explicit
constraint — *"let the user figure it out without giving a hint"* — means the mechanic has to
notify without revealing, which is a different shape of feature than `showMoveHints`/`PathPreview`
entirely, not a stealth version of the same thing.

### The mechanic

A pure, cheap **detector**, not a hint. Every time it becomes the human's turn (2P vs AI, or the
human's own turns within a multiplayer seating — see Scope below), inspect the legal moves
*already generated for move validation* (`generateLegalMoves` — no new expensive computation, this
list exists on every turn regardless) for a jump chain meeting a notable-chain threshold (see Open
Decisions). If one exists **anywhere on the board for that player**, show a small, non-directional
badge — *"A strong chain is out there this turn"* — with no indication of which peg, which
direction, or how long. This is categorically different from `PathPreview`: that reveals an exact
path once you've already selected a peg and are hovering a destination; this only ever says
*whether* something worth finding exists, never *where*.

**On success**: if the human's committed move that turn meets or beats the flagged threshold,
fire a distinct "Challenge found!" reward — a badge/toast separate from the existing 2+-hop chain
badge, plus the chain-bonus scoring from Part A. This closes the notice → seek → find → rewarded
loop the ask is actually describing.

**On a miss**: nothing punitive. The notification simply clears at the end of the turn (whether or
not they found it) — no penalty, no "you failed" state. This matches the game's existing tone
(the AI characters' `worried`/`celebrate` states are personality beats, not scorekeeping) and
avoids turning a discovery mechanic into pressure. An optional, purely positive running tally
("Challenges found: 3") is fine; a miss counter is not, unless a human specifically asks for one.

### Why this doesn't touch `showMoveHints`

`PathPreview` and the destination-highlighting it's part of stay exactly as they are — untouched,
still accessibility-load-bearing per the prior council's finding. This challenge layer is a
**separate, independently-toggleable setting** (its own `Settings` field, e.g.
`showChainChallenges`), additive on top, not a replacement. This is precisely the "these are two
differently-sized features" scoping the Technical Architect insisted on in the prior pass — this
plan keeps that boundary rather than quietly merging them.

### Scope: which turns get a challenge

The ask specifically frames this as *"in single-player mode, when you're playing against another
AI"* — i.e. the human's own turns in a human-vs-AI game. Concretely: only fire the detector on a
turn belonging to a human seat, and only when at least one AI seat is present (an all-human
pass-and-play game gets no challenge layer in this design — there's no "AI opponent" framing to
hang it on, and it would need its own fairness thinking across multiple humans, which is
explicitly out of scope here, not silently included).

### A free tie-in that already exists

`GameScreen` already computes a `worried` state for the AI (an eval-drop check right after its own
move) and, since the Astro work, the same check for a human's move. If the human successfully
plays the flagged challenge chain, the opposing AI's own eval will have genuinely dropped —
its badge will show `worried` *for real*, no new logic needed. This is a reward the architecture
already pays for; it just needs the challenge feature to exist for players to notice it landing
right after a "Challenge found!" moment.

---

## Part C — Difficulty curve & comeback mechanics (acknowledged, not designed here)

HANDOFF.md flagged both of these as open (a human-calibrated difficulty curve; comeback/kingmaker
risk in 3+ player games). Neither was asked for this round, but both quietly bound how *legible*
any scoring system feels: if Sirius pulls so far ahead that the score gap reads as insurmountable
by round 20, that's a scoring-perception problem even though its root cause is difficulty tuning,
not scoring math. Flagging the dependency, not designing around it — this deserves its own pass,
separately, with its own council if wanted, not a bolt-on paragraph here.

---

## QA lens: edge cases this design has to survive

- **Pass-and-play attribution** — resolved by construction (Part A): score is computed per-seat
  off `GameState`, same as `rank()`, not hand-attributed by UI code guessing whose turn it was.
- **Save/resume mid-game** — resolved by construction: live score is derived, not stored: nothing
  new to desync between a save and a resume, and no interaction with a settings change mid-game
  (there's no setting gating the live score itself).
- **Reduced motion** — resolved by construction: the score chip and the challenge badge are both
  text, not particles/motion — the primary channel, not a fallback bolted on afterward.
- **Difficulty ambiguity in any persisted best-table** — resolved by keying on `(tier,
  playerCount)`, never a single global number (Part A).
- **Version drift if AI weights are retuned later** — resolved by keeping the score's math
  entirely independent of `ai/eval.ts`'s tunable weights (Part A), and by giving any persisted
  best-table its own versioned key, isolated from `starleap.save.v1`.
- **A finished player (per the just-shipped `skipFinishedPlayers` fix)** — their score simply stops
  changing once they stop taking turns; no special-casing needed, since score only updates on a
  committed move and a finished seat commits none.

---

## Publishing-readiness lens

The user's own framing — *"this will be needed before we go and really look to publish it out in
the wild"* — is itself a claim worth checking, not just accepting. What scoring/gamification
*does* buy toward publishing readiness: a reason to play more than one game (retention hook), and
a legible answer to "what am I actually being rewarded for" that a cold, first-time player
currently has to infer from the rules screen alone. What it does **not** address, and shouldn't be
assumed to: discoverability (nothing here helps anyone find the game), onboarding polish beyond
what Phase 11/13 already did, or the anonymous-telemetry gap HANDOFF.md separately flagged as
"arguably the single highest-value new idea" for actually knowing whether any of this lands once
shipped. If "publish it out in the wild" is the real goal, telemetry (even the one-event
fire-and-forget version already scoped in HANDOFF.md) arguably has a stronger claim on being built
*first* — without it, there's no way to tell afterward whether the challenge mechanic in Part B is
landing or being ignored.

---

## Proposed build order (not scheduled — ready to become a real phase if/when decided)

Mirrors this project's own phase/task/verification-gate format so it can be dropped into
`IMPLEMENTATION_PLAN.md` with minimal translation, if that's the decision:

1. **`engine/scoring.ts`** — pure scoring functions + unit tests (component-by-component, per
   seat, zero UI). *Verify: `npm test` covers score monotonicity (more pegs home / longer chains
   never score lower, all else equal) as a property test, matching this repo's existing fast-check
   usage for board math.*
2. **Live score display** wired into `SeatBadges`/`GameScreen` chrome. *Verify: axe-audit +
   reduced-motion-full specs extended to the game screen with scoring on; a new e2e asserting
   per-seat score attribution survives a pass-and-play turn cycle.*
3. **Chain-challenge detector** (`engine/scoring.ts` or a sibling module) — pure function over
   already-generated legal moves. *Verify: unit tests with hand-built board fixtures (same pattern
   as `debugScenarios.ts`) confirming detection fires exactly at the threshold, never reveals
   which peg.*
4. **Challenge UI**: notification + "Challenge found!" reward, its own settings toggle
   (`showChainChallenges`), independent of `showMoveHints`. *Verify: e2e confirming the badge never
   renders peg/cell-specific information (a leak check, not just a presence check); axe +
   reduced-motion parity.*
5. **(Optional, separable) Local best-table**, `starleap.bests.v1`, keyed by `(tier,
   playerCount)`. *Verify: unit tests for the versioned-key read/write pattern, mirroring
   `persistence.ts`'s existing tests.*
6. **Full regression sweep** — `npm test && npm run lint && npm run typecheck && npm run build &&
   npx playwright test` — same closing gate every phase in this project has used.

## Open decisions (genuinely the human's call, not mine to default silently)

1. **What counts as a "notable" chain for the Part B detector** — options, not a pick:
   - *Hop count* — e.g. `hopCount >= 3` (between the existing 2-hop badge and 5-hop shake
     thresholds).
   - *Uses STARLEAP's signature rule* — any hop with `span > 1` (a non-adjacent pivot), regardless
     of total chain length. Thematically the tighter fit ("the thing that makes this game unique"
     is literally the trigger), and cheap to check (`Hop.span` already exists).
   - *Both, combined* — e.g. "3+ hops, at least one with span > 1."
2. **Whether to build the local best-table (Part A) in this pass at all**, or ship live scoring
   alone first and decide on persistence after seeing how it feels in play.
3. **Whether the challenge layer defaults on or off** — an opt-in settings toggle is the lower-risk
   default (matches how `cordonNeutralCorners`/`showMoveHints` were both shipped defaulting *on*,
   for what that precedent is worth, but this is a discovery mechanic a returning player might find
   noisy on repeat games in a way a rules toggle isn't).
4. **Whether telemetry should actually be sequenced before this**, per the Publishing-Readiness
   section above — this plan's author's lean, not a decision made on the human's behalf.

# STARLEAP — Game Specification

STARLEAP is a browser-based, zero-backend Chinese Checkers variant with **chained long-jumps**,
a **residency rule** that removes the classic blocking stalemate, and a **difficulty ladder of
named AI opponents** (Nova, Vega, Rigel, Sirius) verified by headless self-play rather than by eye.

This document is the source of truth for game rules, board math, AI behavior, and animation feel.
It is transcribed and expanded from `buildkit.md` (Parts 1-4). Where this document and
`buildkit.md` ever disagree, this document wins — it is the one the engine is built against.

---

## 1. Board math

### 1.1 Coordinate system

Cube coordinates `(x, y, z)` with the invariant `x + y + z = 0`. Every board cell is a lattice
point satisfying this constraint.

### 1.2 On-board predicate

```
onBoard(c) = (c.x ≤ 4 && c.y ≤ 4 && c.z ≤ 4) || (c.x ≥ -4 && c.y ≥ -4 && c.z ≥ -4)
```

This union of two overlapping triangular regions (each a hexagon-plus-points shape in cube space)
produces exactly the six-pointed star (hexagram):

- **121 cells total**
- **61-cell central hexagon** (the region where all three of `|x|,|y|,|z| ≤ 4` hold)
- **six 10-cell corner triangles** (one per point of the star)

This must be verified by assertion/property test at build time, never assumed.

### 1.3 Corners

A cell is a **corner cell** iff exactly one coordinate lies outside `[-4, 4]`. The six corners are
identified by which coordinate/direction is out of range:

| Corner | Condition |
|---|---|
| X+ | `x ≥ 5` |
| X- | `x ≤ -5` |
| Y+ | `y ≥ 5` |
| Y- | `y ≤ -5` |
| Z+ | `z ≥ 5` |
| Z- | `z ≤ -5` |

Each corner triangle has exactly 10 cells (the classic triangular-number arrangement, rows of
1+2+3+4).

### 1.4 Opposite pairs

Each corner has exactly one antipodal corner, used as the start→target axis for a seated player:

- `X+ ↔ X-`
- `Y+ ↔ Y-`
- `Z+ ↔ Z-`

### 1.5 Neighbors

The six unit directions in cube space:

```
(1,-1,0) (1,0,-1) (0,1,-1) (-1,1,0) (-1,0,1) (0,-1,1)
```

A cell's neighbors are itself plus each direction vector, filtered by `onBoard`.

### 1.6 Distance

```
distance(a, b) = (|a.x-b.x| + |a.y-b.y| + |a.z-b.z|) / 2
```

### 1.7 Symmetry

60° rotation: `(x, y, z) → (-z, -x, -y)`. Applying this to every cell in the board's cell set must
produce the same set (set-equality, not order-equality). This is a required property test — it is
the cheapest possible check that the board shape is actually a hexagram and not some lopsided
approximation of one.

### 1.8 Screen projection

For rendering, using `q = x`, `r = z`, and a hex-cell spacing constant `S` (pixels):

```
px = S * (q + r/2)
py = S * r * (√3 / 2)
```

Every neighbor cell is then exactly `S` pixels from its neighbor on screen — this is what makes
hop-distance calculations for animation timing (`hopDistance / S`) meaningful.

### 1.9 Seating

| Player count | Corners used |
|---|---|
| 2 | one opposite pair (e.g. X+ ↔ X-) |
| 3 | alternating corners: `x≥5, y≥5, z≥5` |
| 4 | two opposite pairs |
| 6 | all six |

Player N's **start** corner and **target** corner are always an opposite pair.

---

## 2. Rules, formalized

### 2.1 Move types

A turn is **exactly one** of:

- **STEP** — move one peg to an adjacent empty cell. Turn ends immediately.
- **JUMP CHAIN** — one or more hops per the long-jump rule below, ending voluntarily or when no
  further hop is legal.

A turn is never a mix of the two, and never zero moves (a player with any legal move must move).

### 2.2 STEP

Move a peg from cell `c` to a neighbor cell `c + d` (one of the six unit directions) where
`c + d` is on board and empty. Turn ends.

### 2.3 JUMP CHAIN — custom rule 1 (long jumps)

A **hop** from cell `c` in direction `d` (one of the six unit directions) with integer span
`n ≥ 1` is legal iff **all** of the following hold:

1. `pivot = c + n·d` is on board and **occupied** — by any peg, of any color, including the
   mover's own.
2. Every cell `c + k·d` for `k = 1 .. n-1` (the `n-1` cells strictly between `c` and the pivot,
   the "approach gap") is on board and **empty**.
3. `landing = c + 2n·d` is on board and **empty**.
4. Every cell `c + k·d` for `k = n+1 .. 2n-1` (the `n-1` cells strictly between the pivot and the
   landing, the "departure gap") is on board and **empty**.

`n = 1` collapses to the ordinary classic-rules short jump (adjacent pivot, land one cell beyond)
— classic Chinese Checkers jump generation must fall out as the `n=1` special case of this same
function, not as separate code.

After landing, the peg may hop again from its new cell (any direction, any valid span) or stop.
A chain is therefore a sequence of one or more hops, all by the same peg, in a single turn.

**Chain constraints:**

- No cell may be **occupied by the moving peg twice** within one chain, i.e. the sequence of
  cells the peg itself has stood on (start + every landing) must have no repeats. Long-jump spans
  make geometric cycles possible, so this check is required for move generation to terminate.
- Hard cap: **24 hops** per chain. (121 cells means a non-repeating walk cannot exceed 121 hops
  in any case, but 24 is the practical cap — no legal position should approach it, and it bounds
  worst-case search.)
- The chain may be stopped after any hop, subject to the residency rule (2.4) applying to the
  final resting cell only.

### 2.4 Residency — custom rule 2 (pass through, don't rest)

At the **end of a turn** (not mid-chain), a peg may not occupy any corner triangle other than
**its own start corner** or **its own target corner**.

- Mid-chain, a peg may freely pass through and even land-and-continue-from any corner triangle.
- Only the **final** resting cell of the turn is checked.
- With fewer than six players seated, corners with no assigned owner are **neutral**. **By
  default** (`cordonNeutralCorners: true`, Settings → "Cordon unclaimed corners"), a neutral
  corner is a **waypoint only**: a peg may hop through it — and even land-and-continue-from it —
  mid-chain, but may never end a turn there, exactly as if it belonged to another seated player.
  Player-reported rule change (Phase 12, 2026-09-17): the original version of this rule allowed
  resting in a neutral corner, which read as a bug to players unfamiliar with the "your target is
  the opponent's start" mechanic inherent to fewer-than-six-player seating. Turning the Settings
  toggle off restores that original behavior.

Consequence: no peg can ever end a turn squatting in another player's target triangle, and no
peg can ever end a turn blocking someone else's corner permanently. This removes the classic
Chinese Checkers "opponent parks in your target forever" degenerate case entirely — there is no
"you win if permanently blocked" special rule in STARLEAP because permanent blocking of a target
corner by a foreign peg is impossible by construction. By default this now extends to unclaimed
corners too: they're cordoned off as pass-through space, not a resting spot, for anyone.

### 2.5 Anti-backward-block

Once a peg has left its own start triangle for the first time, it may never again end a turn
inside its own start triangle. This is tracked as one boolean per peg (`hasLeftStart`), set the
first time the peg ends a turn (or, equivalently, the first time it ever occupies a non-start
cell — implementations may set it at move-application time as soon as the peg's cell is outside
its start corner) and checked whenever validating a candidate final resting cell.

This exists purely to block the degenerate strategy of leaving one peg parked at home forever
to simplify the position; it has no effect on normal play once a peg is en route.

### 2.6 Win condition

A player wins individually when all ten of their pegs occupy cells in their target corner
triangle. In a multiplayer game, the game **continues** for the remaining players/placements —
finishing order matters (see stats, P7). The overall game ends when either only one player has
pegs left unfinished, or the stalemate condition below triggers.

### 2.7 Stalemate

If **150 full rounds** (a round = every seated player has taken one turn) pass with no player
completing their win condition, the game ends and players are ranked by:

1. Number of pegs already home (descending), then
2. Summed remaining distance-to-target across all pegs (ascending — closer is better).

---

## 3. AI

STARLEAP verifies its own AI quality overnight via headless self-play — this is treated as a
first-class deliverable of Phase 2, built *before* any UI exists, and used as the exit gate for
every AI-related phase after it.

### 3.1 Evaluation function

Per player, higher is better. Weighted sum of:

| Term | Sign | Description |
|---|---|---|
| `Σ distance(peg, target apex)` | `-1` | primary progress term — sum of each peg's distance to its target corner's apex cell |
| `max distance(peg, target apex)` | `-W_lag` | the game ends on the player's *last* peg home, so the single worst straggler matters more than the mean; this term specifically penalizes leaving a peg behind |
| `pegs already in target` | `+W_home` | count of pegs already resident in the target triangle |
| `lateral deviation from start→target axis` | `-W_spread` | pegs that wander off the direct start-to-target line can't be jumped over by their own teammates, which slows the whole formation; penalizing this keeps pegs in jump-ladder formation |
| `count of jump-ready alignments` | `+W_ladder` | pairs of the player's own pegs at some span `n` with the `n-1` approach and departure gaps clear on both sides — i.e. positions from which a long jump is currently available. This is the term that makes the AI actively build launchable formations instead of shuffling pegs forward one step at a time |
| `number of reachable landings` | `+W_mobility` | count of distinct legal landing cells across all of the player's pegs this turn — general mobility/flexibility term |

Initial weights (tuned during the Phase 3 gate, recorded in DECISIONS.md if changed):
`W_lag = 2.0`, `W_home = 8.0`, `W_spread = 0.5`, `W_ladder = 1.5`, `W_mobility = 0.05`.

### 3.2 Search

- **2 players:** iterative-deepening alpha-beta with a Zobrist-hashed transposition table,
  time-budgeted (search deepens until the tier's time budget is spent, then returns the best move
  found at the deepest completed depth).
- **3+ players:** max^n search (each player maximizes their own evaluation, no player is treated
  as an adversary-only minimizer) at a fixed depth of 2 plies per player-turn. Because long jumps
  create a large branching factor, moves are pruned to the **top K** by static (1-ply) evaluation
  delta before recursing further — K is set per difficulty tier (below).

### 3.3 Difficulty ladder

| Tier | Depth | Top-K | Noise | Time budget | Notes |
|---|---|---|---|---|---|
| **Nova** | 1 | 6 | 35% fully random move | 250ms | jump chains capped at 2 hops during search — it literally cannot see long chains |
| **Vega** | 1 | 12 | 10% fully random move | 600ms | full chain generation |
| **Rigel** | 3 | 16 | 0% | 1.5s | |
| **Sirius** | iterative-deepening to time budget | 24 | 0% | 2.5s | transposition table; opening ladder book (a short table of strong known opening formations) |

"Noise" = probability the tier picks a uniformly random legal move instead of its searched best
move, simulating a weaker player rather than a slower one.

Runs in a **Web Worker**, never the main thread — a 1.5-2.5s search would otherwise freeze all
UI animation.

### 3.4 The self-play gate

Round-robin tournament, 200 games per ordered pairing, fully headless (engine + AI only, no
rendering). Must show:

- **Monotonic strength**: each tier beats the tier directly below it in the ladder at **≥60%**
  win rate (Nova < Vega < Rigel < Sirius).
- **Zero illegal moves** produced across all games.
- **Zero non-terminating games** (every game reaches a win or the 150-round stalemate cap).
- **p95 move generation time under 5ms** (measuring `generateLegalMoves`, not AI search time).

If the ladder is not monotonic, weights in §3.1 or Top-K/depth in §3.3 are tuned and the
tournament is rerun — the plan does not advance past Phase 3 until this passes. This is what
turns "the AI technically makes legal moves" into "the AI is actually a difficulty ladder."

---

## 4. Animation and feel

Concrete numbers are specified here precisely because vague animation direction ("make it feel
nice") produces inconsistent slop across an unattended multi-session build.

### 4.1 Hop physics

- Parabolic arc. Apex height `h = S * 0.45 * √(hopDistance / S)` — longer jumps fly visibly
  higher, not just further.
- Duration `= clamp(180ms + 40ms * √(hopDistance / S), max 420ms)`.
- Vertical position over normalized time `t ∈ [0,1]`: `y(t) = 4h * t * (1 - t)` (a simple
  parabola peaking at `h` when `t = 0.5`).
- Horizontal position eased with `easeInOutSine` (not linear) so the hop reads as a launch and
  landing rather than a slide with a bounce on top.

### 4.2 Squash and stretch

- `scaleY = 0.85` at the takeoff and landing frames (peg compresses).
- `scaleY = 1.08` at the apex (peg stretches).
This single detail is called out in the brief as the highest-return visual detail in the project
— prioritize it over more elaborate effects if time is short.

### 4.3 Shadow

A separate ellipse element beneath the peg. Its `opacity` and `scale` are both inversely
proportional to current hop height (full size/opacity at ground level, shrinking and fading
toward the apex). This sells the sense of height more than the arc motion itself does.

### 4.4 Chain pacing

- 70ms gap between the end of one hop and the start of the next within a chain.
- Each successive gap in the same chain shrinks by 8% (compounding) — long chains visibly
  accelerate, reading as building momentum toward a triumphant finish.
- One audio tone per hop, ascending a pentatonic scale (wrapping/octave-shifting for chains
  longer than 5 hops) — a 7-hop chain should sound like it's earned, per the brief.

### 4.5 Path preview

On hover (desktop) or tap (touch, before committing) of a legal destination cell:

- Render dotted arcs for every hop in the chain that reaches that destination, in order.
- Number each hop along its arc (1, 2, 3, ...).
- Highlight each hop's pivot cell in a contrasting color.
- This is the primary teaching mechanism for the long-jump rule — no separate explanation text
  should be required to understand a chain once its preview is visible.
- Long-press (or an explicit "replay" affordance) replays the chosen chain hop-by-hop at normal
  animation speed before it's committed.

### 4.6 Landing juice

- Ring-ripple effect centered on the landing cell after every hop.
- Particle burst — **only** when a hop lands inside the mover's own target triangle (reserve the
  strongest visual payoff for actual progress toward winning, not every hop).
- 3px screen shake on any chain of 5 or more hops.

### 4.7 AI characters

Each AI opponent (Nova, Vega, Rigel, Sirius) has one SVG face with exactly six states:

| State | Trigger |
|---|---|
| `idle` | default; breathing loop, 4s period |
| `thinking` | from the start of the AI's turn until it commits a move; orbiting dots, eyes tracking the board |
| `found-it` | fires the instant the worker's search completes, before the move is applied |
| `move` | while the chosen peg is animating; character leans toward its peg |
| `celebrate` | fires when the AI completes its win condition |
| `worried` | fires when the AI's own evaluation score drops sharply turn-over-turn |

Personality is expressed through amplitude/frequency of the same six states, not different
assets: Nova bounces continuously and broadly; Rigel's motion is minimal and precise; Sirius is
near-static except a brief `celebrate` on winning.

**Minimum visible thinking time:** the `thinking` state must visibly appear within **100ms** of
the AI's turn starting, even if the Web Worker actually returns a move in 30ms — enforce a floor
of roughly 400ms of visible `thinking` before allowing `found-it` → `move` to play, so a fast
tier (e.g. Nova at 250ms budget) never appears to not think at all.

### 4.8 Reduced motion

Under `prefers-reduced-motion: reduce`, non-optionally:

- Hop arcs become instant position changes (no parabola, no easing).
- Particle effects are disabled entirely.
- AI character states render as static (final-frame) poses, no looping/breathing animation.

This is an accessibility requirement (feeds into the Phase 8 axe/lighthouse gate), not a
cosmetic toggle.

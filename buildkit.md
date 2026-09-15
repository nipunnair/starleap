# STARLEAP — Overnight Build Kit

A zero-backend, single-file-deployable Chinese Checkers variant with chained long-jumps.
Built for the Ralph loop pattern you used on cadbury and Parivar.

---

## Part 0 — The name

**STARLEAP.** The board is a star, the signature mechanic is the leap, and the chain of leaps is the
whole game. Short, no trademark collisions, reads fine to a seven-year-old and a sixty-year-old.

AI opponents are named after stars, which doubles as the difficulty ladder:

| Difficulty | Name | Personality |
|---|---|---|
| Easy | **Nova** | Eager, bouncy, celebrates its own bad moves |
| Medium | **Vega** | Steady, polite, mildly smug |
| Hard | **Rigel** | Cold, precise, minimal animation, unnerving |
| Expert | **Sirius** | Silent until it wins, then briefly theatrical |

Fallback names if you want something warmer for family: **Nakshatra** (constellation), **Chhalaang**
(leap). Keep STARLEAP as the product name and use these as board themes.

---

## Part 1 — Architecture decisions (pre-decided so the agent doesn't dither)

Ambiguity is what kills overnight runs. Every one of these is locked; the agent is told not to
revisit them.

**Stack**
- Vite + React 18 + TypeScript. No UI framework, no state library (`useReducer` only).
- `src/engine/` is pure TypeScript with **zero imports** — no React, no DOM. This is the single most
  important constraint: it makes the engine testable headlessly at thousands of games per minute,
  which is what lets the agent verify game *quality* overnight without you.
- Board renders as **SVG** (121 circles, trivial hit-testing, CSS transforms are GPU-composited).
  Particles render on a **canvas overlay** above it.
- AI runs in a **Web Worker**. Non-negotiable — a 2.5s alpha-beta search on the main thread freezes
  every animation you're about to build.
- Audio via **Web Audio API** oscillators. No audio files, keeps the single-file build small.
- Tests: `vitest` + `fast-check` (property tests) + `playwright` (visual/flow).

**Distribution** — three artifacts from one codebase:
1. `dist/` — normal static bundle, drop on any web server.
2. `starleap.html` — one self-contained file via `vite-plugin-singlefile`. Email it to family, they
   double-click it. This is the killer feature for your use case.
3. `Dockerfile` (nginx:alpine) + GitHub Pages workflow for anyone else who wants to deploy it.

Plus PWA manifest + service worker so it installs to a phone home screen and works on a plane.

**Board math** — hand this to the agent rather than letting it derive it. Getting the star wrong
costs hours.

Cube coordinates `(x, y, z)` with `x + y + z = 0`.

```
onBoard(c) = (c.x ≤ 4 && c.y ≤ 4 && c.z ≤ 4) || (c.x ≥ -4 && c.y ≥ -4 && c.z ≥ -4)
```

That union of two triangles is exactly the hexagram: **121 cells**, central hexagon of **61**, six
corner triangles of **10** each. Verify with assertions, don't trust it.

- Corners: exactly one coordinate outside `[-4, 4]`. Six of them: `x≥5, x≤-5, y≥5, y≤-5, z≥5, z≤-5`.
- Opposite pairs (start → target): `(x≥5 ↔ x≤-5)`, `(y≥5 ↔ y≤-5)`, `(z≥5 ↔ z≤-5)`.
- Neighbors: `(1,-1,0) (1,0,-1) (0,1,-1) (-1,1,0) (-1,0,1) (0,-1,1)`.
- Distance: `(|dx| + |dy| + |dz|) / 2`.
- 60° rotation: `(x,y,z) → (-z,-x,-y)`. Use it as a test — the board set must be invariant.
- Screen projection with `q = x`, `r = z`: `px = S*(q + r/2)`, `py = S*r*(√3/2)`. Every neighbor is
  then exactly `S` pixels away.
- Seating: 2P → one opposite pair. 3P → alternating `x≥5, y≥5, z≥5`. 4P → two opposite pairs.
  6P → all.

---

## Part 2 — Rules, formalized

This is the section that most needs to be unambiguous. Your two custom rules in precise form:

**Move types.** A turn is either one STEP or one JUMP CHAIN. Never both.

**STEP:** move a peg to an adjacent empty cell. Turn ends.

**JUMP CHAIN (custom rule 1 — long jumps):** one or more hops. A hop from cell `c` in direction `d`
with span `n ≥ 1` is legal when:
- `pivot = c + n·d` is on board and **occupied** (by any peg, any colour, including your own)
- every cell `c + k·d` for `k = 1..n-1` is on board and **empty** — the `n-1` gaps before the pivot
- `landing = c + 2n·d` is on board and **empty**
- every cell `c + k·d` for `k = n+1..2n-1` is on board and **empty** — the matching `n-1` gaps after

`n = 1` is the ordinary short jump, so classic rules fall out as a special case. After landing you
may hop again from the new cell, or stop.

Chain constraints: no cell may be visited twice within one chain (long jumps make cycles real —
without this, move generation never terminates). Hard cap of 24 hops. You may stop at any point,
subject to the residency rule below.

**Residency (custom rule 2 — pass through, don't rest):** at the *end* of a turn, a peg may not
occupy any corner triangle other than its own start or its own target. Mid-chain it may pass through
and land in anything. With fewer than six players, unoccupied corners are neutral and resting there
**is** allowed.

Worth noting: this rule quietly dissolves the classic Chinese Checkers blocking problem. No opponent
can ever squat in your target triangle, so the usual "you win if blocked" special case is unneeded.

**Anti-backward-block:** a peg that has ever left its start triangle may not end a turn inside it
again. One boolean per peg. Prevents the degenerate strategy of parking a peg at home forever.

**Win:** all ten of your pegs in your target triangle. In multiplayer, play continues for remaining
placements.

**Stalemate:** 150 full rounds with no win → rank by pegs-home, then by summed distance to target.

---

## Part 3 — The AI, and how it verifies itself overnight

This is where an unattended build usually produces something that technically runs and is no fun.
The fix is a headless self-play harness built in **phase 2, before any UI exists**, used as the exit
gate for every later phase.

**Evaluation function** (per player, higher is better):
- `-Σ distance(peg, target apex)` — primary progress term
- `-W_lag · max distance` — the game ends on your *last* peg, so the bottleneck matters more than
  the average. Most naive Chinese Checkers AIs miss this and leave stragglers.
- `+W_home · pegs already in target`
- `-W_spread · lateral deviation from the start→target axis` — pegs off-axis can't be jumped over
- `+W_ladder · count of jump-ready alignments` — pairs at span `n` with the `n-1` gaps clear on both
  sides. This is what makes the AI build ladders instead of shuffling.
- `+W_mobility · number of reachable landings`

**Search:** 2 players → iterative-deepening alpha-beta with Zobrist transposition table, time-budgeted.
3+ players → max^n at depth 2. Branching factor is large because of long jumps, so prune to the top
K moves by static eval delta before recursing.

**Difficulty ladder:**

| | Depth | Top-K | Noise | Budget | Notes |
|---|---|---|---|---|---|
| Nova | 1 | 6 | 35% random | 250ms | chains capped at 2 hops — it literally can't see the big ones |
| Vega | 1 | 12 | 10% | 600ms | full chain generation |
| Rigel | 3 | 16 | 0 | 1.5s | |
| Sirius | ID to budget | 24 | 0 | 2.5s | TT, opening ladder book |

**The gate:** round-robin, 200 games per pairing, headless. Must show monotonic strength — each
tier beats the tier below it at ≥60%. Zero illegal moves, zero non-terminating games, p95 move
generation under 5ms. If the ladder isn't monotonic, the agent tunes weights and reruns rather than
moving on. That single harness is what turns "it compiles" into "it's actually fun."

---

## Part 4 — Animation and feel

Concrete numbers, because "nice animations" produces slop.

**Hop physics.** Parabolic arc, apex height `h = S · 0.45 · √(hopDistance/S)` — long jumps fly
visibly higher. Duration `180ms + 40ms · √(hopDistance/S)`, clamped to 420ms. Vertical position
`y = 4h·t(1-t)`; horizontal eased slightly with `easeInOutSine` so it reads as a launch, not a slide.

**Squash and stretch.** `scaleY 0.85` at takeoff and landing frames, `1.08` at apex. This is the
single highest-return detail in the whole project.

**Shadow.** Separate ellipse, `opacity` and `scale` inversely proportional to height. Sells the arc
more than the arc does.

**Chain pacing.** 70ms between hops, decreasing 8% per hop so long chains accelerate and feel
triumphant. One tone per hop, ascending a pentatonic scale — hop 7 of a chain should sound earned.

**Path preview.** On hover or tap of a legal destination: dotted arcs for every hop, numbered in
order, pivots highlighted in a contrast colour. This is how a family member learns the long-jump
rule without reading anything. Long-press replays it hop-by-hop.

**Landing juice.** Ring ripple at the landing cell. Particle burst only on landing inside the target
triangle. 3px screen shake on chains of 5+ hops.

**AI characters.** SVG face per opponent with states: `idle` (breathing, 4s loop), `thinking`
(orbiting dots, eyes tracking the board), `found-it` (brief pop, fires when search completes), `move`
(leans toward its peg), `celebrate`, `worried` (triggers when its eval drops sharply). Thinking state
must appear within 100ms of turn start even if the worker answers in 30ms — a floor of ~400ms of
visible thinking makes the opponent feel alive. Nova bounces constantly; Rigel barely moves.

**`prefers-reduced-motion`:** arcs become instant position changes, particles off, characters static.
Non-optional.

---

## Part 5 — The kickoff prompt

Paste this once into Claude Code in an empty directory. It bootstraps the repo and the loop.

````
You are building STARLEAP, a browser-based Chinese Checkers variant, autonomously and overnight.

AUTONOMY CONTRACT — read carefully:
- Do not ask me questions. I am asleep. Every decision you need is either in
  docs/SPEC.md (which you are about to write from this brief) or is yours to make.
- When you make a judgment call, append it to DECISIONS.md with a one-line rationale
  and keep going.
- When you hit something genuinely blocked, write it to BLOCKED.md, implement the
  simplest thing that keeps the build green, and move to the next task.
- Commit after every completed task. Small commits, imperative messages.
- Update PROGRESS.md after every task: what's done, what's next, current gate status.
  Assume your context will be wiped; PROGRESS.md is your only memory.

STEP 1 — Bootstrap. Create:
  docs/SPEC.md            — the full game spec (transcribe sections "Rules, formalized",
                            "Board math", "AI", and "Animation" from the brief I'm pasting
                            below, verbatim and expanded)
  docs/ARCHITECTURE.md    — module boundaries, data flow, worker protocol
  IMPLEMENTATION_PLAN.md  — the phase list below, decomposed into 5-15 concrete tasks
                            per phase, each with its own verification command
  AGENTS.md               — how a fresh context picks up work: read PROGRESS.md, find
                            the first unchecked task in IMPLEMENTATION_PLAN.md, do it,
                            run its gate, commit, update PROGRESS.md
  PROMPT_build.md         — the loop prompt (content given below)
  loop.sh                 — the Ralph loop runner
  PROGRESS.md, DECISIONS.md, BLOCKED.md — initialized empty

STEP 2 — Scaffold. Vite + React 18 + TypeScript. vitest, fast-check, playwright,
vite-plugin-singlefile, vite-plugin-pwa. CI that runs typecheck + lint + test.
Commit.

STEP 3 — Work the plan, phase by phase, until every gate passes. Do not move to the
next phase until the current phase's gate is green.

PHASES AND GATES:

  P1 Engine core — coords, board construction, state, move generation (steps +
     long-jump chains), residency and anti-block rules, win/stalemate detection.
     GATE: `npm test` green. Property tests assert: board is exactly 121 cells with
     six 10-cell corners and a 61-cell hexagon; the set is invariant under the 60°
     rotation (x,y,z)→(-z,-x,-y); every generated move is reversible in principle;
     no chain revisits a cell; n=1 long-jump results are identical to a hand-written
     classic-rules jump generator. Engine directory imports nothing.

  P2 Self-play harness + greedy baseline AI.
     GATE: 1000 headless games complete, zero illegal moves, zero games hitting the
     move cap, p95 move generation under 5ms.

  P3 Full AI ladder — Nova/Vega/Rigel/Sirius in a Web Worker, time-budgeted.
     GATE: round-robin, 200 games per pairing, each tier beats the tier below at
     ≥60%. If not monotonic, tune eval weights and rerun. Do not proceed until it is.

  P4 Board UI — SVG board, peg selection, legal-destination highlighting, path
     preview with numbered arcs, turn flow, pass-and-play.
     GATE: playwright completes a full human-vs-Nova game start to win.

  P5 Animation and juice — per the animation spec. 60fps with 6 players animating.
     GATE: playwright screenshots at 8 key states; performance trace shows no frame
     over 20ms during a 7-hop chain.

  P6 AI characters — per-opponent SVG avatars, all six states, minimum visible
     thinking time.
     GATE: playwright asserts thinking state appears within 100ms of AI turn start.

  P7 Meta — menus, 2/3/4/6 player config with any human/AI mix, settings, rules
     screen, interactive tutorial teaching the long jump, undo, save/resume to
     localStorage, post-game stats.
     GATE: playwright covers config → play → quit → resume → finish.

  P8 Polish — mobile-first responsive down to 360px, touch targets ≥44px,
     keyboard navigation, screen-reader move announcements, prefers-reduced-motion,
     PWA offline.
     GATE: lighthouse ≥90 on performance and accessibility; axe reports zero
     critical violations.

  P9 Packaging — dist/, single-file starleap.html, Dockerfile, GitHub Pages
     workflow, README with three deployment paths.
     GATE: starleap.html opened via file:// plays a complete game against Sirius
     with zero network requests.

  P10 Final sweep — re-run every gate, self-review the diff for dead code and
     TODOs, write HANDOFF.md describing what's built, what's deferred, and how to
     extend it.

ANTI-RABBIT-HOLE: if a single task takes more than 8 tool-use cycles, ship the
simplest working version, note the shortcut in DECISIONS.md, and move on. Aesthetic
refinement is never a blocker.

--- BRIEF FOLLOWS ---
[paste Parts 1-4 of this document here]
````

---

## Part 6 — The loop

`PROMPT_build.md` — fed fresh on every iteration:

````
Read AGENTS.md, PROGRESS.md, and IMPLEMENTATION_PLAN.md.

Find the first unchecked task. Do exactly that one task.

Run its verification gate. If it fails, fix it and rerun — up to 3 attempts, then
record the failure in BLOCKED.md, implement the simplest passing alternative, and
continue.

Commit. Check the task off in IMPLEMENTATION_PLAN.md. Update PROGRESS.md.

Do not ask questions. Do not refactor unrelated code. Do not start the next task.
````

`loop.sh`:

```bash
#!/usr/bin/env bash
set -u
for i in $(seq 1 200); do
  echo "=== iteration $i — $(date) ==="
  cat PROMPT_build.md | claude -p --dangerously-skip-permissions --max-turns 60 \
    2>&1 | tee -a .loop.log
  if grep -q "ALL PHASES COMPLETE" PROGRESS.md; then
    echo "done at iteration $i"; break
  fi
  sleep 5
done
```

Run it: `chmod +x loop.sh && ./loop.sh`

Because the engine is pure and the self-play harness is built in phase 2, the loop can genuinely
evaluate its own output. Most overnight builds can only check that code compiles. This one can check
that the game is winnable, terminating, and that the hard AI actually beats the easy one.

---

## Part 7 — What to check when you wake up

In order, five minutes:

1. `cat PROGRESS.md` — how far it got.
2. `cat DECISIONS.md` — where it used its judgment. This is where surprises live.
3. `cat BLOCKED.md` — should be empty or trivial.
4. `npm run selfplay -- --tournament` — the ladder must still be monotonic.
5. Open `starleap.html` by double-clicking it. Play one game against Nova, one against Sirius.

The two failure modes to look for specifically: long-jump chain generation that misses valid chains
(play a position where you know a 4-hop chain exists and check the preview offers it), and an AI
that leaves stragglers behind (watch whether Sirius's last peg arrives near the same time as its
first ten — if it trails badly, the `W_lag` weight needs raising).

---

## Part 8 — Hosting

For family: `starleap.nynair.com` via the Cloudflare Tunnel you already run — it's static files, so
point the tunnel at any tiny static server, or skip the Mac mini entirely and put `dist/` on
Cloudflare Pages since there's no backend to host. For everyone else, the README's Docker one-liner
and the double-clickable `starleap.html` cover it.

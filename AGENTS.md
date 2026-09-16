# AGENTS.md — how a fresh context picks up work on STARLEAP

Assume you have no memory of any prior session on this project. This file, `PROGRESS.md`, and
`IMPLEMENTATION_PLAN.md` are your entire context. Read them in this order:

1. **`PROGRESS.md`** — what's done, what's next, current gate status. This is the only thing to
   trust for "where are we" — it is rewritten after every single task.
2. **`IMPLEMENTATION_PLAN.md`** — find the first line matching `- [ ]` (unchecked). That is your
   task. Read its phase's GATE line too, so you know what "done" means for the phase as a whole,
   not just the one task.
3. **`docs/SPEC.md`** and **`docs/ARCHITECTURE.md`** — the rules/board-math/AI/animation spec and
   the module boundaries. Consult the relevant section for the task at hand; don't re-read either
   file cover to cover every time.
4. **`DECISIONS.md`** — judgment calls made so far, with rationale. Skim before making a new
   judgment call of your own — you may be about to re-decide something already settled.
5. **`BLOCKED.md`** — things that were genuinely blocked and worked around. Should be empty or
   short. If your task touches something listed here, read the workaround before redoing it.

## The loop, one task at a time

1. Do exactly the one task you found. Nothing else — no drive-by refactors, no "while I'm here."
2. Run its verification command (given at the end of the task line).
3. If it fails: fix and rerun, up to 3 attempts. If still failing after 3 attempts, record the
   failure in `BLOCKED.md` with what was tried, implement the simplest thing that keeps the build
   green (may mean a narrower/simpler version of the task), and note the shortcut. Do not leave
   the repo in a red state.
4. If a single task is taking more than ~8 tool-use cycles with no end in sight, stop, ship the
   simplest working version, note the shortcut in `DECISIONS.md`, and move on — per the
   anti-rabbit-hole rule. Aesthetic refinement is never a blocker.
5. Check the task off in `IMPLEMENTATION_PLAN.md` (`- [ ]` → `- [x]`).
6. Commit. One task = one commit, imperative mood (`Add cube coordinate primitives`, not `Added`
   or `Adding`).
7. Update `PROGRESS.md`: move the task to "done," name the next unchecked task, and update the
   phase's gate status if this task was the phase's gate-run task.
8. Stop. Do not start the next task in the same pass — a fresh context (or the loop runner) picks
   it up next.

## When a phase gate fails

Don't check off the gate task and move to the next phase. Fix within the current phase's tasks,
or add a new task line to the current phase (clearly marked, e.g. `P3.9b`) if the fix needs a
step the plan didn't anticipate. Record why in `DECISIONS.md`.

## Non-negotiables (do not re-litigate these — see docs/SPEC.md and buildkit.md Part 1)

- `src/engine/**` imports nothing outside itself. Not React, not DOM, not `src/ai/**`.
- AI search runs in a Web Worker, never the main thread.
- Single codebase produces both `dist/` and the single-file `starleap.html` — no forked source.
- Vite + React 18 + TypeScript, no additional UI framework, no external state library.

## Autonomy rules

- Never ask the human a question. Every decision is either already answered in `docs/SPEC.md`, or
  is yours to make — make it, write it to `DECISIONS.md` with a one-line rationale, keep going.
- Never leave the working tree uncommitted at the end of a pass.
- Never leave `npm test` / `npm run typecheck` / `npm run lint` red across a commit boundary.
- **Never run `git push`.** Commit locally after every task, as always, but this run stays
  unpushed — the human reviews the whole batch and pushes it themselves.

## Phase 11 scope guardrail

`HANDOFF.md`'s "Future scope" section lists items beyond Phase 11's own 8 tasks (full menu/config
redesign, replacing move hints with a reward system, any leaderboard, anonymous telemetry, a
human-calibrated difficulty curve, comeback/kingmaker mechanics). These are **out of bounds** for
an autonomous pass — they need a product decision or real design work first, not just an unclaimed
task slot. If Phase 11's tasks (`P11.1`-`P11.8`) are all checked off and `IMPLEMENTATION_PLAN.md`
has no more unchecked lines, stop. Do not invent a new phase or start on a `HANDOFF.md` item that
isn't already an explicit `- [ ]` line in `IMPLEMENTATION_PLAN.md`.

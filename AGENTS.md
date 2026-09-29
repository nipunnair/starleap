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
3. If it fails: follow OVERNIGHT_RUNBOOK.md. After three failed fix attempts, leave the task
   unchecked, record BLOCKED and stop; restore green runtime without discarding others’ work.
4. If a task exceeds ~8 tool-use cycles, simplify or split in-scope work as the runbook allows.
   Do not weaken acceptance or mark unfinished work complete. Aesthetic refinement is not a blocker.
5. Check the task off in `IMPLEMENTATION_PLAN.md` (`- [ ]` → `- [x]`).
6. Update `PROGRESS.md`: done/next/gate status; update evidence and decisions as needed.
7. Commit all task changes together. One task = one commit, imperative mood.
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

## Family-pilot scope and overnight execution

Nipun authorized the family-pilot plan and overnight loop. The current Phase 14–16 tasks in
IMPLEMENTATION_PLAN.md supersede the previously scheduled Nova campaign/daily rotation, now
archived. BACKLOG.md preserves ideas but grants no execution scope. Only personal bests, four
rival badges, five shareable puzzles, tutorial clarity and their qualification are in scope.

**Build independently, verify completely, then hand over for human validation.** Read
OVERNIGHT_RUNBOOK.md and follow its failure/cutoff/readiness contract. It supersedes any older
instruction suggesting checking off a reduced substitute or moving on after failed acceptance.
After three failed fix attempts, leave the task unchecked, preserve diagnostics, restore green
runtime, mark BLOCKED, and stop the loop. Do not weaken tests to hit the morning target.

Update PROGRESS, plan, decisions and evidence BEFORE the one-task commit, not afterward. Verify
unit tests, typecheck and lint at every code commit, plus the task's tests. Final readiness needs
full E2E, both builds, offline/Pages sharing checks, axe/Lighthouse and agent browser inspection.
Human testing is for product acceptance, not first discovery of basic functional failures.

One task per wake, one local commit per task; never push/deploy. Preserve other user changes,
including pre-existing untracked .loop.overnight.out. Use the scheduled heartbeat only; do not
start legacy loop.sh concurrently. Stop after P16.4, on a blocking failure, or at the morning
cutoff specified in the runbook. Notify with evidence-based READY_FOR_REVIEW or NOT_READY.

## Concurrent-agent ownership

Read COORDINATION.md before starting Phases 14–16. They are reserved to the family-pilot
heartbeat in the sibling `../starleap-family-pilot` worktree on `codex/starleap-family-pilot`.
Other agents must not pick those tasks from this checkout's scheduling snapshot. The reserved
runner must not edit this shared checkout or integrate its branch automatically. Live progress
and validation are in its dedicated worktree. Other unrelated work can continue independently.


## Isolation update (latest execution rule)

This branch owns family-pilot implementation only in its dedicated sibling worktree. Follow
OVERNIGHT_RUNBOOK.md for atomic pass locking, reserved ports, resource limits and RUN_LOG
checkpoints. Never write in the shared checkout even though the task's default cwd may point
there. Check branch/path before every pass; use explicit workdir. Do not merge/rebase other
agents' work. Report branch readiness separately from integration readiness. The user resumed
the overnight work: current morning cutoff is 2026-09-29 08:00 America/Los_Angeles.

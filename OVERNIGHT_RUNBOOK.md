# Overnight family-pilot implementation

**Build independently, verify completely, then hand over for human validation.**

## Runner and boundaries

Use Codex heartbeat `starleap-overnight-family-pilot`, every 15 minutes in this task, one
implementation task per wake. Pause that automation by ID using automation_update on stop. Do not also
start `loop.sh`: it is the legacy Claude runner and would create a concurrent writer. No nested
agent CLI, extra automation, worktree or parallel worker is needed. Work in this checkout and
make one local commit per task. Preserve pre-existing `.loop.overnight.out` unchanged/untracked.
Do not push, deploy, publish, send family messages, change hosting, or spend money on services.

Target review time: **2026-09-28 08:00 America/Los_Angeles (15:00 UTC)**. A deadline never
justifies skipping checks. At the first wake at/after cutoff, do not start another implementation
task: report READY only with completed evidence, otherwise report NOT_READY and the exact next
task/blocker. A task already running may finish safely; record any overrun. Stop this heartbeat
on completion, a blocking failure, or cutoff. Resume requires new user direction.

Local scheduled work requires the machine awake, Codex running, repository accessible, and
available usage. Do not promise completion if execution is interrupted or limits are exhausted.

## One pass

1. Read AGENTS, PROGRESS, first unchecked plan task and phase gate; consult relevant SPEC,
   ARCHITECTURE, DECISIONS and BLOCKED. Check git status and active work before writing. Never
   discard another writer's changes. If unexpected active changes overlap, stop and report.
2. If run status is BLOCKED, READY_FOR_REVIEW, or cutoff reached, do not start more work.
3. Implement exactly the first unchecked task. Make routine choices from the contract; log
   rationale. Do not silently broaden scope or ask about ordinary implementation details.
4. Run targeted verification and `npm test && npm run typecheck && npm run lint`. At most three
   fix/retry attempts per task across wakes (persist attempts in BLOCKED). If still failing,
   leave task unchecked, record evidence and set PROGRESS BLOCKED. Revert only the current pass's
   failing code if needed to restore the previous green build, preserving diagnostics. Never
   commit failing runtime code, fake a pass, delete coverage, or substitute a smaller feature
   that no longer meets acceptance. Stop scheduling rather than retry indefinitely.
5. The old eight-cycle rule means simplify implementation, not acceptance. If work is too large,
   split the current task into explicitly linked in-scope subtasks and record why; do not mark
   the parent complete until acceptance passes. Aesthetic perfection never blocks correctness.
6. Record evidence, check off only successful work, update PROGRESS (done/next/gates) and
   DECISIONS as necessary, then commit them WITH the code. Do not leave these updates for a
   second uncommitted step. End the pass; scheduler handles the next task.

## Evidence and readiness

Maintain VALIDATION.md with command, exit status, counts, timestamp and code revision for each
phase gate. Put transient logs/screenshots in ignored artifacts/family-pilot/ and reference their
paths. Record browser flows, viewport sizes, console findings, accessibility results, both builds,
and exactly which checks were automated vs visually inspected. Do not claim physical phone
coverage from a resized desktop viewport.

Before READY: all active tasks complete, full final gate on final code, manual agent browser
inspection complete, no unresolved blocker, artifacts built, clean tracked working tree, and
REVIEW_READY.md explains how Nipun can run and test it. A final docs-only commit may follow the
tested code revision; any runtime change invalidates affected evidence and requires reruns.

Never emit a readiness document with a success status just because the loop has no unchecked
lines. At an incomplete cutoff, create/update REVIEW_READY.md as NOT_READY with exact remaining
work and failures. The user receives an honest morning report, not a guaranteed green result.

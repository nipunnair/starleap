## Resumed execution — user instruction October 8, 2026
The user authorized completing all remaining work now, with token discipline. The old cutoff
and stop-after-one-task rules below are superseded for this active resumed session. Continue
sequentially through verified tasks to full qualification. Keep isolation, ownership, local
commits, no push/deploy, and evidence requirements. Automation remains paused to avoid overlap.

# Overnight family-pilot implementation

**Build independently, verify completely, then hand over for human validation.**

## Runner and boundaries

Use Codex heartbeat `starleap-overnight-family-pilot`, every 15 minutes in this task, one
implementation task per wake. Pause that automation by ID on stop. Work ONLY in the dedicated
sibling worktree `../starleap-family-pilot`, branch `codex/starleap-family-pilot`, forked from
58305a3 plus coordination notice 4322047. The scheduler task's default cwd may still be the
shared checkout: explicitly set workdir on EVERY command and use absolute paths for file edits.
Check `git rev-parse --show-toplevel` and `git branch --show-current` before each pass.

Do not edit the original starleap checkout, main, other agents' branches or other worktrees.
No automatic merge/rebase/cherry-pick/reset/stash/clean, push, deployment, or remote branch work.
Read main's HEAD only to record divergence for later integration; do not chase concurrent changes.
Live PROGRESS, RUN_LOG, VALIDATION and REVIEW_READY are maintained in this dedicated tree only.
COORDINATION.md in main tells other agents this queue is reserved; do not keep updating it.

Use Node 24.15.0 explicitly for every npm/npx command: `mise exec node@24.15.0 -- npm ...`
or `mise exec node@24.15.0 -- npx ...`. This installed version matches the shared baseline; the
new directory otherwise inherits Node 25, whose native localStorage conflicts with jsdom tests.
Use independent node_modules/builds/evidence and fresh browser contexts. Do not symlink another
checkout's dependencies, delete shared caches, or share browser storage/profiles. Reserved ports:
4273 Playwright, 4274 Lighthouse, 4275 manual preview. Tests have strict binding/no server reuse;
if a port is occupied, stop that operation and report conflict, never kill its owner. Use at most
two test workers and one heavy suite at a time. Stop only processes this pass started; no broad
pkill/killall. For manual previews use --host 127.0.0.1 --port 4275 --strictPort.
Do not also start legacy loop.sh or any other runner. No family messages or new paid services.

Target review time: **2026-09-29 08:00 America/Los_Angeles (15:00 UTC)**. A deadline never
justifies skipping checks. At the first wake at/after cutoff, do not start another implementation
task: report READY only with completed evidence, otherwise report NOT_READY and the exact next
task/blocker. A task already running may finish safely; record any overrun. Stop this heartbeat
on completion, a blocking failure, or cutoff. Resume requires new user direction.

Local scheduled work requires the machine awake, Codex running, repository accessible, and
available usage. Do not promise completion if execution is interrupted or limits are exhausted.

## Pass ownership and continuous progress

Before any mutation, run `bash scripts/pilot-lock.sh acquire <unique-token>` in this worktree.
The atomic directory claim refuses overlapping passes. Retain the returned/caller token and
release only your own claim with `bash scripts/pilot-lock.sh release <same-token>` after all
checks/commit. A pass lasting more than one schedule interval keeps its lock; a later wake must
skip writing. Never clear another token or infer abandonment merely from elapsed time. Inspect
owner/timestamp/processes and a possible interrupted pass; if ownership is uncertain, report a
stalled lock and pause, preserving edits. Only recover your own confirmed interrupted claim.

On each successful task append to RUN_LOG.md: UTC start/end, task, outcome, tested code revision,
passed checks, remaining task count and next step (the commit containing the row is found with
`git log -- RUN_LOG.md`). Update PROGRESS atomically with that task's commit. Attempt/failure
counts survive wakes in BLOCKED.md. Before each pass compare the current first unchecked task
and HEAD with the previous checkpoint: repeating the same task without a commit twice is a
stall requiring diagnosis/notification, not another blind retry. A live long test with owned
process/log evidence counts as active work, not a stall. Never claim polling itself is progress.

On each wake read shared main's HEAD without modifying it; record divergence in the final review
report. READY_FOR_REVIEW applies to this isolated branch. Integration with other agents' changes
and combined regression checks remain a distinct human-controlled step.

## One pass

1. Acquire the pass lock and verify worktree/branch. Read AGENTS, PROGRESS, first unchecked plan task and phase gate; consult relevant SPEC,
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

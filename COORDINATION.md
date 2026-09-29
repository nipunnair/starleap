# STARLEAP agent coordination

## Reserved family-pilot work

Owner: Codex task 01a0e563-30ff-7222-9ad7-55d85ec96916 / heartbeat
`starleap-overnight-family-pilot`.

Implementation branch: `codex/starleap-family-pilot`.
Dedicated sibling worktree: `../starleap-family-pilot`.
Base: `58305a3` plus this coordination notice. Phases 14–16 are reserved to that run.
Other agents may continue separate work on main or their own branches/worktrees; do not execute
the family-pilot tasks from this checkout's unchanged plan or edit its dedicated worktree.

The family-pilot runner updates PROGRESS.md, RUN_LOG.md, VALIDATION.md and eventual
REVIEW_READY.md in its OWN worktree only. Read those files there for current progress; main's
plan/progress is the scheduling snapshot, not the live execution ledger. No cherry-pick, rebase,
merge, reset, push or deployment onto main is performed by the overnight runner. Integration
and combined regression validation are separate from isolated-branch readiness.

Resource reservation: loopback ports 4273 (Playwright), 4274 (Lighthouse), 4275 (manual preview).
The runner uses strict ports and refuses existing servers; it must not kill another process to
claim a port. Dependencies, dist, browser profiles and evidence stay inside the dedicated tree.
Do not run legacy loop.sh alongside the heartbeat. One active pass owns the worktree lock.

Next review target after the user's continuation: 2026-09-29 08:00 America/Los_Angeles.

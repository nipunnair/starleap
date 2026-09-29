# Family-pilot run checkpoints

This branch is the live execution ledger. Main is not modified by the heartbeat.
Base: 58305a3 plus coordination notice 4322047. Feature tasks remaining: 16; next P14.2.

Each task adds UTC start/end, task ID, outcome, tested revision, verification evidence and next
step in the same commit as implementation. A repeated task without a commit across two wakes
requires diagnosis; locks held by a live running pass are not evidence of stalled work.

## Isolation setup — 2026-09-29

Dedicated worktree/branch created, independent npm dependencies installed, isolated strict test
ports and two Playwright workers configured, and token-owned pass lock added. Main has only
received the coordination notice; its game code and other agents' files remain untouched.
This is setup, not completion of P14.1. Validation: 134 unit tests, typecheck and lint pass under Node 24.15.0 (one existing lint
warning); two isolated menu E2E tests pass; Lighthouse 98 performance / 100 accessibility.
Atomic-lock tests pass for competing acquisition, dry run, wrong-owner release, idempotent
release and invalid tokens. Occupied-port probes confirm both test tools fail without reusing
or terminating the existing server. The first run under the directory's default Node 25 failed
seven storage tests; pinning the baseline Node 24 fixed the environment without test changes.
End checkpoint: 2026-09-29T01:09Z; remaining tasks 17; next P14.1. Tested changes are those in
the commit containing this checkpoint; main HEAD at setup is 4322047.


## P14.1 — 2026-09-29T01:30:15+00:00

Start: 2026-09-29T01:25:21Z. End: 2026-09-29T01:30:15+00:00. Outcome: COMPLETE, first attempt green.
Tested revision: code in this checkpoint's commit (parent 25f0b87); no code changed after checks.
Targeted Vitest: 23 pass; full unit suite: 157 pass / 27 files; typecheck/lint/diff check exit 0
(existing ConfigScreen lint warning only). Pure accounting/eligibility only, no UI feature yet.
Remaining tasks: 16. Next P14.2. Main read-only HEAD: 4322047, unchanged since isolation.
No blockers; owned lock released after local commit. No push or integration.

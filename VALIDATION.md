# Family-pilot validation evidence

## Status

**NOT QUALIFIED — planning baseline only.** New features are not implemented or tested yet.
This file is maintained by each phase gate. REVIEW_READY.md is the final human handoff.

## Planning baseline — 2026-09-27 19:15 America/Los_Angeles

Existing code revision: 19d39c9 (planning-only changes since that revision).

| Command/check | Result |
|---|---|
| npm test | Exit 0; 26 files, 134 tests passed |
| npm run typecheck | Exit 0 |
| npm run lint | Exit 0; engine/AI boundary checks pass; one existing ConfigScreen fast-refresh warning |
| git diff --check | Exit 0 |
| Active-plan audit | 17 unique unchecked tasks, P14.1 through P16.4; backlog/runbook have no executable checkboxes |

Builds, E2E, browser inspection, axe and Lighthouse were not rerun for this documentation-only
planning change. They are mandatory for the actual feature qualification, not implied by the
baseline results above.

## Gate evidence to append

For each phase: tested code revision, time, exact command, exit status/counts, failures and fixes,
artifact paths, and inspected browser flows/screenshots. Distinguish automated, agent-inspected,
and human-tested evidence. No human acceptance has taken place.


## Isolation setup — 2026-09-29T01:09Z

Scope: dedicated worktree, test-server ownership and pass locking, not feature readiness.
Tested revision: setup code in the commit containing this evidence; parent 4322047.

- `mise exec node@24.15.0 -- npm test`: exit 0, 134 tests / 26 files.
- `mise exec node@24.15.0 -- npm run typecheck`: exit 0.
- `mise exec node@24.15.0 -- npm run lint`: exit 0, existing ConfigScreen warning only.
- `npx playwright test menu.spec.ts`: exit 0, two tests pass on the isolated server.
- `npm run lighthouse`: exit 0, 98 performance / 100 accessibility. These two smoke checks
  ran under the inherited Node 25 before pinning all future commands to Node 24.
- Atomic-lock probe in a temporary directory: concurrent acquire has exactly one winner;
  wrong owner cannot release; dry run creates no lock; release is idempotent; bad token refused.
- Temporary owned HTTP servers on 4273/4274: Playwright and Lighthouse respectively exit nonzero
  on occupied ports, original server remains alive and unchanged. Probe servers then cleaned up.
- Initial unit run under inherited Node 25 failed seven native-localStorage/jsdom tests; retry
  with baseline Node 24.15.0 passes all tests. No product or test logic weakened.
- `git diff --check` and `bash -n scripts/pilot-lock.sh`: pass.

Feature gates remain NOT STARTED. No human testing or combined-main integration validation claimed.


## P14.1 — 2026-09-29T01:30:15+00:00

Tested code is in the commit containing this entry, parent 25f0b87; no code changes after checks.
All npm/npx commands used `mise exec node@24.15.0 --`.

- `npx vitest run src/progression/__tests__/sessionStats.test.ts`: exit 0, 23 tests.
- `npm test`: exit 0, 157 tests / 27 files.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0, boundary checks pass, existing ConfigScreen warning only.
- `git diff --check`: exit 0.

Focused coverage: real engine-generated long-hop chain counts as one move; seat-1 human and AI
attribution; multiplayer accounting/record exclusion; immutable snapshots; sticky undo and
monotonic sequence; stale/duplicate/out-of-order events; serialization; legacy partial history;
completed-loss vs win/efficiency eligibility; stalemate boundary; mode and comparison-key isolation.
No browser/build gate required for this pure-module task; phase/release gates remain pending.


## P14.2 — 2026-09-29T01:53:15Z

Tested code: checkpoint commit, parent a43e62c. All npm/npx via mise Node 24.15.0.
- `npm test`: exit 0, 167 tests / 28 files.
- `npm run typecheck`: exit 0 (initial implementation's three strict-index errors corrected).
- `npm run lint`: exit 0, existing ConfigScreen warning only; engine boundary passes.
- `npx playwright test progress-resume.spec.ts save-resume.spec.ts undo.spec.ts`: exit 0,
  9/9 Chromium tests, two workers, reserved strict port 4273; pre-test normal build passes.
- `git diff --check`: exit 0.

Browser checks cover exact saved board, counters/identity/sequence through reload and undo,
reload during paused animation (no premature score), reload during AI thinking (one reply),
terminal reload before results, debug exclusion, and malformed/version-mismatched storage.
Unit additions cover v1 migration, invalid v2 fields/overlap/context, quota failure preserving
active save, and duplicate callbacks before/after undo. No human/manual visual check claimed;
full gate, standalone build and release qualification remain pending. Final test logs:
`artifacts/family-pilot/p142-unit.log`, `artifacts/family-pilot/p142-browser.log` (ignored).

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

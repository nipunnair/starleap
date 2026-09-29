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


## P14.3 — 2026-09-29T06:05:01Z

Tested code: this checkpoint commit, parent 8194329. All npm/npx via mise Node 24.15.0.
- Targeted `npx vitest run src/progression/__tests__/records.test.ts src/app/__tests__/progressStore.test.ts`:
  exit 0, 19 tests. Fixture extracted to avoid importing/registering another test suite.
- `npm test`: exit 0, 186 tests / 30 files.
- `npm run typecheck`, `npm run lint`, `git diff --check`: exit 0;
  existing ConfigScreen warning only, boundaries pass.
Tests cover ties/improvements/losses/undo, four badges, human seat 1, changed AI versions,
legacy/nonstandard/multiplayer/abandoned/stalemated exclusion, receipt retirement/replay and
capacity, reload/retry, corrupt/unknown storage, disabled storage and failed atomic writes.
Logs: artifacts/family-pilot/p143-targeted.log and p143-unit.log (ignored).
No browser/manual/build evidence claimed for this store task; UI integration is P14.4.


## P14.4 — 2026-09-29T06:27:14Z

Tested runtime is in this checkpoint commit, parent 23d6b48; no runtime edits after checks.
All commands use mise Node 24.15.0. `npm test`: exit 0, 186 tests / 30 files.
`npm run typecheck`, `npm run lint`, `git diff --check`: exit 0 (existing ConfigScreen warning).
`npx playwright test personal-records.spec.ts rival-badges.spec.ts post-game-stats.spec.ts win-screen.spec.ts`:
exit 0, 7 tests, 3.1 minutes, two workers, strict port 4273; pre-test normal build passes.
New tests use seeded terminal envelopes to isolate award presentation/reload, loss chain reward,
legacy honesty, quota failure, collection earned/unearned state, rematch identity and next-rival
seat preservation/Sirius boundary. Existing two full-game UI tests independently reach game over
and verify original match statistics/ranking/menu return. Not claiming seeded fixtures prove
actual-game award eligibility; pure eligibility tests and subsequent phase gate cover that.
Logs: artifacts/family-pilot/p144-unit.log and p144-browser.log. No manual visual or physical
phone test claimed in this task; responsive/accessibility/visual qualification remains pending.


## P14.5 — 2026-09-29T06:47:17Z

Final runtime: checkpoint commit, parent e57b246. Node 24.15.0 via mise throughout.
- `npm test`: exit 0, 186 tests / 30 files.
- `npm run typecheck`, `npm run lint`, `git diff --check`: exit 0; existing ConfigScreen warning only.
- Task Playwright suite (`match-progress`, `responsive-360`, `keyboard-nav`, `settings`,
  `axe-audit`): exit 0, 19 tests; normal build passes; two workers/strict port 4273.
Initial suite exposed stale settings-test flow (discard confirmation after initial autosave).
Second suite had already loaded that test before its edit, so repeated the same failure.
Final suite with explicit confirmation passes; runtime was not relaxed. Label exports moved
into cornerGuidance.ts to avoid new Fast Refresh warnings. Final screenshots manually inspected:
`artifacts/family-pilot/p145-360.png` (360×900) and `p145-1280.png` (1280×900 full page).
Letters, home counts and legal hints readable; no labels cover portraits/pegs; no horizontal
page overflow. Agent also used isolated in-app browser at 4275: Tab reached board, Right moved
visible gold focus ring twice; desktop screenshot checked. Closed its tab and stopped its own
preview session. No physical phone or screen-reader testing claimed. Automated axe suite passes.
Logs: p145-unit.log, p145-browser.log in artifacts/family-pilot; prior failure logs retained as
p145-attempt1.log / p145-attempt2.log (first copy may overlap the running log rewrite).


## P14.6 / Phase 14 gate — 2026-09-29T07:05:18Z — PASS

Runtime remains 1c38ef0; gate tests/docs are in this checkpoint commit. Node 24.15.0 via mise.
- `npm test`: exit 0, 186 tests / 30 files.
- `npm run typecheck`, `npm run lint`, `git diff --check`: exit 0; only existing ConfigScreen warning.
- `npx playwright test personal-records.spec.ts rival-badges.spec.ts progress-resume.spec.ts finished-player.spec.ts reduced-motion-full.spec.ts axe-audit.spec.ts`:
  exit 0, 26 tests in 14 seconds; two workers, strict port 4273, normal production build passes.
- Extended axe checks: populated results/collection at 360×900 and 1280×900 with reduced motion;
  zero serious/critical violations, zero page errors, zero horizontal overflow.

Manually viewed all four saved screenshots: artifacts/family-pilot/p146-results-360.png,
p146-results-1280.png, p146-collection-360.png, p146-collection-1280.png. Text/portraits/earned
labels and action buttons readable, collection wraps cleanly at phone width. This is resized
Chromium coverage, not physical-phone testing. Duration on a resumed result remains current
mount time (0s in these captures), the documented preexisting timer limitation; not an award metric.
Four badge tests resume seeded near-win standard positions, perform an engine-legal human
winning move through UI, verify human move count increments and the matching badge is earned,
then reload to verify one durable receipt. Other tests cover completed losses, corrupt/unavailable
storage, legacy exclusion, undo/reload, AI interruption, debug exclusion, finished multiplayer
seats and reduced motion. Pure tests cover rules/AI versions, receipt retirement and eligibility.
Logs: artifacts/family-pilot/p146-unit.log and p146-browser.log. Phase 14 gate green;
Phase 15 puzzles and Phase 16 final qualification remain. No READY_FOR_REVIEW claim.

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


## P15.1 — 2026-09-29T07:24:00Z

Tested code in checkpoint commit, parent 14fda9e. Node 24.15.0 via mise throughout.
`npx vitest run src/progression/__tests__/puzzles.test.ts`: exit 0, 15 tests.
`npm test`: exit 0, 201 tests / 31 files. Typecheck/lint/diff check: exit 0,
existing ConfigScreen warning only. No runtime edits after tests.
References: First Chain two hops/one move; Long Leap span-2 hop/one move; Turn the Corner
changed-direction two hops/one move; Build the Route step+hop/two moves; Home Stretch
step+hop/two moves ending in mover's target corner. Tests cover immutable stationary pivots,
legal references, false/unknown goals and versions, forged moves, illegal resting cells,
alternative two-move completion, target -1/equal/+1 boundaries, undo/restart and setup necessity.
Logs: artifacts/family-pilot/p151-targeted.log and p151-unit.log. Pure-module task; no browser
or UI qualification claimed. Phase 15 gate awaits picker, play, storage and sharing.


## Cutoff audit — 2026-10-05T02:32:49Z — NOT_READY

Read-only audit: correct isolated path/branch, clean starting tree, no active pass lock, HEAD
6f9410e, main 4322047; divergence main...pilot 0/8 before this docs commit. Ten unchecked tasks
P15.2–P15.7 and P16.1–P16.4. Phase 14 evidence and P15.1 unit checks are historical; no final
release evidence exists. No runtime changes or test reruns today. Docs diff check passes.

## Resumed implementation — 2026-10-09T02:53:58.764416+00:00

P15.2–P15.5: 209/209 units (32 files), typecheck exit 0, lint/boundaries exit 0
(one pre-existing ConfigScreen refresh warning), 17/17 puzzle browser checks exit 0.
Logs: artifacts/family-pilot/resume/starleap-pilot-{unit,puzzles}.log.
Initial test assertion distinguished JSON-normalized negative zero; assertion now compares
serialized round-trip values. All five engine-legal reference paths completed in real UI.

## Tutorial — 2026-10-09T02:55:16.209361+00:00

P15.6: 209 unit tests, typecheck/lint and all 3 tutorial E2Es pass. Every stage tested against an incorrect legal move. Logs under artifacts/family-pilot/resume/tutorial-*.log.

## Phase 15 gate — 2026-10-09T02:56:50.304814+00:00

P15.7 GREEN: 209 units, typecheck/lint exit 0; 32/32 regression browser tests. Keyboard-only solution with hints off and reduced motion at 360/1280px, axe on completion/picker/confirmation, no page errors/overflow. Screenshots under resume/puzzle-*.png inspected; mobile text readable, controls separated, board intact. Normal keyboard/responsive/axe regressions pass.

## Interactive browser inspection — 2026-10-09

Owned preview on strict port 4275; app browser initially used its prior cached build, then
reload activated the new service worker build. Confirmed saved-game replacement, played the
First Chain star destination, observed Moves 1 / Hops 2 and medal + efficiency star, used Undo,
then reloaded and observed restored Moves 0 / Hops 0 with Undo disabled. Browser error log
was empty. Closed our tab and stopped only our preview session afterward. Mobile/desktop
screenshots and keyboard/axe evidence are in artifacts/family-pilot/resume/puzzle-*.png.

## Qualification checkpoint — 2026-10-11T01:37:36.194101+00:00

P16.1: normal/singlefile builds exit 0; all 5 integration checks pass (8.4m), including full Sirius offline game with zero HTTP requests, PWA resume, preserved records and Pages fresh-context sharing. Offline gate tested 6f78995 runtime; later navigation hardening is covered by 210 units, typecheck/lint and 10 targeted browser checks (including Pages). Final whole-suite rerun follows on committed code.

## Final qualification — 2026-10-11T01:54:14.954366+00:00

Tested code `e8ecc2620ba6245fa7c0e1c89bcf136055f84f62`; complete command chain exit **0**.
Started 2026-10-11T01:37:36Z (unit log local time 18:37:36 America/Los_Angeles).
Ended by 2026-10-11T01:54:14.954366+00:00. All commands run in the isolated worktree via
`mise exec node@24.15.0 --`, with two Playwright workers and one heavy suite at a time.

| Command after mise prefix | Result | Evidence under artifacts/family-pilot/resume/ |
|---|---|---|
| npm test | exit 0; 210 tests / 32 files | final-unit.log |
| npm run typecheck | exit 0 | final-typecheck.log |
| npm run lint | exit 0; boundaries pass, one existing refresh warning | final-lint.log |
| npm run build | exit 0 | final-build.log |
| npm run build:singlefile | exit 0 | final-singlefile.log |
| npx playwright test | exit 0; 114/114, no retries; 14.8m | final-e2e.log |
| npm run lighthouse | exit 0; performance 98, accessibility 100 | final-lighthouse.log |

Browser gate includes all five puzzle solutions, native/copy/cancel/error sharing and fresh
second context, normal-game and puzzle save replacement, Back/Forward, interrupted animation,
reload/undo/quota/reward idempotency, strict tutorial objectives, all four actual winning-commit
badge paths using controlled isolated fixtures, axe on every new screen, keyboard/reduced motion,
360/1280px layouts, both offline builds and Pages base-path links. No fixture contaminates the
public game. Full standalone Sirius match completed in 8.2m with zero HTTP requests.

### Final review and agent browser evidence (P16.3)

Reviewed records eligibility (standard solo 2P, unique winner, separate comparison versions,
sticky undo efficiency exclusion, completed-loss chain awards), legacy migration, atomic pending
records/receipt writes, duplicate callbacks, malformed/unknown versions, bounded replay/award
reads, routing/save replacement, user-triggered sharing and accessibility. The two route lifecycle
findings are fixed and their regressions pass. Unknown move types rejected. No open correctness
blockers; no new backend, dependency, telemetry, campaign or daily rotation.

Actual human-vs-Nova UI/worker match completed in 3.1m without console errors at the 150-round
safeguard (not a natural human win); inspected `actual-worker-match.png`. Controlled win fixtures
separately establish all badge paths. Inspected final puzzle active/completion/picker screenshots
at 360/1280 and `../p146-results-360.png`, `../p146-collection-1280.png`: text/controls readable,
no overflow. Final app-browser play on strict preview port 4275 reached Moves 1 / Hops 2,
medal + star, and correct singular share text; error log empty. Its loaded
`/assets/index-Bai4r1Ft.js` matches the final build log. Owned preview retained for human review.

### Readiness audit (P16.4)

All executable tasks checked; BLOCKED.md contains no blockers. REVIEW_READY, HANDOFF, PROGRESS,
BACKLOG and runbook are consistent. Only documentation changes follow the tested code commit.
`git diff --check` passes. Main 4322047 has 0 unique commits; pilot has 13 before final docs
commit, 14 after. No integration/push/deploy. Automation status read from its saved configuration:
PAUSED. Later main integration and combined retesting remain separate. READY_FOR_REVIEW.

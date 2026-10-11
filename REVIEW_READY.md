# STARLEAP family pilot — READY_FOR_REVIEW

All authorized implementation and qualification tasks are complete. Ready for your local
review and family testing; not published or human-approved.

Tested code: `e8ecc2620ba6245fa7c0e1c89bcf136055f84f62` on `codex/starleap-family-pilot`.
Final commit range: `4322047..HEAD` (14 local commits including this documentation-only handoff).
No runtime/test changes follow the qualified code revision. Completed 2026-10-11T01:54:14.954366+00:00.

**Evidence:** 210/210 unit/property tests, 114/114 browser tests (14.8 minutes), typecheck,
lint/boundaries, normal and standalone builds all exit 0. Axe found no serious/critical
violations on new screens. Lighthouse: **98 performance / 100 accessibility**. Final review
has no open correctness blockers. The existing ConfigScreen Fast Refresh lint warning remains
nonblocking. Details and exact commands are in VALIDATION.md.

## Included

- Personal bests for eligible solo games, including chain improvements on completed losses.
- Four first-victory rival badges: Nova, Vega, Rigel, Sirius; rematch/next-rival controls.
- Home counts and target-corner labels; a four-stage tutorial with required objectives.
- Five playable puzzles: First Chain (1 move), Long Leap (1), Turn the Corner (1),
  Build the Route (2), Home Stretch (2). Targets reward efficiency; exceeding them still succeeds.
- Puzzle medals, efficiency stars without undo, retained bests, retry and saved attempts.
- Versioned spoiler-free challenges with native share, copy and selectable-text fallback.

No backend, account, telemetry, campaign, rotating daily puzzle or public leaderboard is required.
GitHub Pages remains sufficient. The live site has not been changed.

## Local review

An owned preview is running at http://127.0.0.1:4275/ for this handoff. To recreate it later,
run in the isolated worktree:

```sh
cd /Users/nipunnair/code/starleap-family-pilot
mise exec node@24.15.0 -- npm run build
mise exec node@24.15.0 -- npm run preview -- --host 127.0.0.1 --port 4275 --strictPort
```

Open http://127.0.0.1:4275/. If that reserved port is occupied, do not terminate its owner.
Close your own earlier preview first. Existing PWA users may need another refresh after its
updated service worker activates.

For a portable offline copy:

```sh
mise exec node@24.15.0 -- npm run build:singlefile
```

Open `/Users/nipunnair/code/starleap-family-pilot/starleap.html` directly in a browser. Build
outputs are ignored generated artifacts. For future Pages publication, the existing build
supports `npm run build -- --base=/starleap/`; publication and integration are separate work.

## Family test (10–15 minutes)

1. Follow the tutorial, including a long jump, two-hop chain and home landing.
2. Open Puzzles, finish First Chain, and observe the medal and efficiency star. Retry using
   two separate hops, then Undo and finish again; completion remains encouraging.
3. Try each remaining puzzle. Reload mid-attempt and confirm the saved position returns.
4. Use Challenge a friend. On the same locally served build, open its link in another browser
   profile. The friend starts the same puzzle with fresh progress and no solution encoded.
5. Play a regular match, inspect personal results and the rival collection, then try rematch.
6. Note whether family members voluntarily retry, chase a star/badge, share, or request more.
   Those observations decide whether a campaign, more content or a backend is worthwhile.

## Storage and sharing limits

Records belong to this browser/origin/device; there is no sync or certified ranking. Clearing
browser storage loses them. One active game OR puzzle is saved; replacement asks first.
Storage denial never blocks play but shows a puzzle save warning. Undo excludes an efficiency
star for that attempt. Puzzle bests/medals survive retry. Legacy match history is conservatively
ineligible for records. Time shown after match resume measures the current screen mount and is
not an award metric. Multi-tab concurrent play is outside the single-active-session pilot.

`file://` challenge links use https://nipunnair.github.io/starleap/ and never disclose local
paths. Public links require the enhanced build to be published before family can use them there.
A loopback preview URL works only on its own computer. Tests stub sharing and send nothing to
real contacts. Browser qualification targets Chromium; family testing should include the actual
phones/browsers they use.

## Evidence and integration

See VALIDATION.md and ignored `artifacts/family-pilot/resume/` for commands, logs and screenshots.
Main was 4322047 with zero main-only commits and 13 pilot-only commits before this final
documentation commit (14 afterward). Integration still requires human-controlled review and
a regression run against the eventual combined main branch.
No push, deploy, merge, rebase or cherry-pick has been performed. Human product acceptance and
any later integration/retest against main remain separate from isolated-branch readiness.

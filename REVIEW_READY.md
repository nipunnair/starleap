# STARLEAP family pilot — qualification in progress

Feature implementation is complete in the isolated `codex/starleap-family-pilot` branch.
Final whole-suite checks and review sign-off are running; this document does not yet claim
READY_FOR_REVIEW. The original cutoff report remains available in commit a7a083e.

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

Run in the isolated worktree:

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
Final code revision, full qualification totals and main divergence will be recorded on completion.
No push, deploy, merge, rebase or cherry-pick has been performed. Human product acceptance and
any later integration/retest against main remain separate from isolated-branch readiness.

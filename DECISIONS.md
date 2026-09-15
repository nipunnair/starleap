# DECISIONS

Judgment calls made during the autonomous build, one line each, with rationale. Newest at bottom.

- **Hand-wrote the Vite scaffold instead of running `npm create vite@latest`.** The interactive
  create-vite CLI (`@clack/prompts`) silently exited with "Operation cancelled" under this
  sandboxed shell even with `--force`/piped stdin, likely a non-TTY prompt-library incompatibility.
  Wrote `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `index.html`, and
  `src/main.tsx`/`App.tsx` by hand instead — verified via `npm run typecheck && npm run lint &&
  npm test && npm run build`, all green. No functional difference from the generator's output.
- **`vite.config.ts` handles both distribution targets via `--mode singlefile`** rather than a
  second config file, per ARCHITECTURE.md's "one codebase, two build targets" requirement — avoids
  config drift between `dist/` and `starleap.html` builds.
- **Added a placeholder smoke test** (`src/app/__tests__/smoke.test.ts`) so `npm test` (and thus
  CI) is green before Phase 1 adds real engine tests — vitest exits non-zero with zero test files
  present. Will be superseded/joined by real tests starting Phase 1; not deleted, just no longer
  the only test.
- **eslint `import/no-restricted-paths` zones enforce the engine-imports-nothing and
  ai-never-imports-ui rules structurally** (per AGENTS.md non-negotiables), not just by code
  review convention, so `npm run lint` is a real gate for architecture drift, not just style.
- **Exempted `src/engine/**/__tests__/**` from the engine-purity import rule.** The zero-import
  constraint is about the engine's runtime/library code (what ships and what self-play calls
  thousands of times a minute); its test files legitimately import `vitest`/`fast-check`, which
  never execute at runtime. Without this exemption `npm run lint` would fail on every engine test
  file that imports its test framework, which isn't the drift the rule is meant to catch.
- **Seating plans for 4P and 6P** (buildkit.md only says "two opposite pairs" / "all six," not
  which pairs or what order): 4P uses X+/X-/Y+/Y- (drops the Z pair), interleaved as
  X+,Y+,X-,Y- so consecutive turns are never between opposite-corner players. 6P uses the true
  60°-rotation geometric cyclic order (X+,Y-,Z+,X-,Y+,Z-, derived by repeatedly applying
  `rotate60` to a corner's apex direction) so turn order actually walks around the star rather
  than jumping erratically. Neither choice affects correctness, only turn-order feel.
- **Property-test convention: exclude the mover's own cell from synthetic occupancy sets.**
  Hit this in both P1.9 (jump-chain revisit test) and P1.12 (reversibility test) — fast-check's
  random occupancy generator can otherwise mark the cell a peg is "standing on" as also
  "occupied by another peg," a contradiction no real game state can reach. This produced two
  false test failures (not engine bugs) before the fix. Any future engine property test that
  generates synthetic occupancy alongside a specific mover cell should filter that cell out.

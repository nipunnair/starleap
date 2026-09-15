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

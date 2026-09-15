import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Note: the authoritative check that src/engine/** imports nothing outside itself, and that
// src/ai/** never imports src/ui/**, is scripts/check-boundaries.mjs (run as part of `npm run
// lint`). eslint-plugin-import's import/no-restricted-paths was tried first but proved
// unreliable under this project's ESLint 9 flat config — see DECISIONS.md.
export default tseslint.config(
  { ignores: ['dist', 'dist-singlefile', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Engine purity, partial: catches React specifically (fast, in-editor feedback). The full
  // zero-import rule (any package, any path outside engine/) is enforced by the boundary script.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    ignores: ['src/engine/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'engine/ must not import React.' },
          ],
        },
      ],
    },
  }
);

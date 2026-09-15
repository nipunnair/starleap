#!/usr/bin/env node
/**
 * Structural enforcement of AGENTS.md's non-negotiables:
 *   - src/engine/** imports nothing outside itself (not even other packages).
 *   - src/ai/** never imports from src/ui/**.
 *
 * eslint-plugin-import's `import/no-restricted-paths` proved unreliable under this project's
 * ESLint 9 flat config (silently failed to flag relative cross-directory imports even with
 * correctly matching globs — see DECISIONS.md). This plain script is the authoritative gate;
 * `npm run lint` runs it after eslint.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/gm;
const EXPORT_FROM_RE = /^\s*export\s+(?:type\s+)?[^'"]*\s+from\s+['"]([^'"]+)['"]/gm;

function listFiles(dir, exclude = []) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (exclude.some((ex) => full.includes(ex))) continue;
    const stats = statSync(full);
    if (stats.isDirectory()) out.push(...listFiles(full, exclude));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function specifiers(fileContents) {
  const specs = [];
  for (const re of [IMPORT_RE, EXPORT_FROM_RE]) {
    for (const match of fileContents.matchAll(re)) {
      specs.push(match[1]);
    }
  }
  return specs;
}

function checkZone(dir, { forbidAll = false, forbiddenPrefixes = [] } = {}) {
  if (!existsSync(dir)) return [];

  const violations = [];
  const files = listFiles(dir, ['__tests__']);

  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    for (const spec of specifiers(contents)) {
      if (forbidAll) {
        if (spec.startsWith('.')) {
          const resolved = resolve(dirname(file), spec);
          const rel = relative(dir, resolved);
          if (rel.startsWith('..')) {
            violations.push(`${relative(process.cwd(), file)}: imports '${spec}' (outside ${relative(process.cwd(), dir)})`);
          }
        } else {
          violations.push(`${relative(process.cwd(), file)}: imports package '${spec}' (engine must import nothing)`);
        }
      }

      for (const prefix of forbiddenPrefixes) {
        if (spec.startsWith('.')) {
          const resolved = resolve(dirname(file), spec);
          if (resolved.includes(prefix)) {
            violations.push(`${relative(process.cwd(), file)}: imports '${spec}' (forbidden: ${prefix})`);
          }
        }
      }
    }
  }

  return violations;
}

const root = resolve(import.meta.dirname, '..');
const violations = [
  ...checkZone(join(root, 'src/engine'), { forbidAll: true }),
  ...checkZone(join(root, 'src/ai'), { forbiddenPrefixes: [join(root, 'src/ui')] }),
];

if (violations.length > 0) {
  console.error('Architecture boundary violations:\n');
  for (const v of violations) console.error(`  - ${v}`);
  console.error('\nSee AGENTS.md non-negotiables.');
  process.exit(1);
}

console.log('Boundary check passed: engine/ imports nothing, ai/ never imports ui/.');

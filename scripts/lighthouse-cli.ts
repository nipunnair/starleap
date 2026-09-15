#!/usr/bin/env tsx
/**
 * `npm run build && npm run lighthouse` (IMPLEMENTATION_PLAN.md P8.8).
 * Starts `vite preview` against the built `dist/`, runs Lighthouse against the menu screen, and
 * fails (non-zero exit) unless both the performance and accessibility categories score >= 90.
 * Uses the CLI-driven `lighthouse` + `chrome-launcher` packages directly rather than
 * `playwright-lighthouse`, since this only needs a one-shot audit, not a Playwright test.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
const MIN_SCORE = 90;

function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Server at ${url} did not respond in time`));
          else setTimeout(tryOnce, 250);
        });
    };
    tryOnce();
  });
}

function stopServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    proc.once('exit', () => resolve());
    proc.kill();
  });
}

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
  });

  try {
    await waitForServer(URL, 30_000);

    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
    try {
      const result = await lighthouse(
        URL,
        { port: chrome.port, output: 'json', logLevel: 'error' },
        { extends: 'lighthouse:default' },
      );
      if (!result) throw new Error('Lighthouse produced no result');

      const categories = result.lhr.categories;
      const performance = Math.round((categories.performance?.score ?? 0) * 100);
      const accessibility = Math.round((categories.accessibility?.score ?? 0) * 100);

      console.log(`Performance:   ${performance}/100`);
      console.log(`Accessibility: ${accessibility}/100`);

      const failures: string[] = [];
      if (performance < MIN_SCORE) failures.push(`performance ${performance} < ${MIN_SCORE}`);
      if (accessibility < MIN_SCORE) failures.push(`accessibility ${accessibility} < ${MIN_SCORE}`);

      if (failures.length > 0) {
        console.error(`Lighthouse gate FAILED: ${failures.join(', ')}`);
        process.exitCode = 1;
      } else {
        console.log('Lighthouse gate PASSED.');
      }
    } finally {
      await chrome.kill();
    }
  } finally {
    await stopServer(preview);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

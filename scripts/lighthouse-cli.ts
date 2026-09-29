#!/usr/bin/env tsx
/**
 * `npm run build && npm run lighthouse` (IMPLEMENTATION_PLAN.md P8.8).
 * Starts `vite preview` against the built `dist/`, runs Lighthouse against the menu screen, and
 * fails (non-zero exit) unless both the performance and accessibility categories score >= 90.
 * Uses the CLI-driven `lighthouse` + `chrome-launcher` packages directly rather than
 * `playwright-lighthouse`, since this only needs a one-shot audit, not a Playwright test.
 */
import { preview } from 'vite';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = Number(process.env.STARLEAP_LIGHTHOUSE_PORT ?? 4274);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('Invalid STARLEAP_LIGHTHOUSE_PORT');
const URL = `http://127.0.0.1:${PORT}/`;
const MIN_SCORE = 90;

async function main() {
  // Resolve only after our own server binds; never audit another agent's existing server.
  const server = await preview({ preview: { port: PORT, host: '127.0.0.1', strictPort: true } });
  try {
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
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => error ? reject(error) : resolve());
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playUntilGameOver } from './helpers';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, '..');
const SINGLEFILE_PATH = path.join(REPO_ROOT, 'starleap.html');

test.describe('Singlefile offline verification (IMPLEMENTATION_PLAN.md P9.3)', () => {
  test.beforeAll(() => {
    // Self-contained: build the singlefile artifact fresh rather than assuming a prior step
    // in the same shell session already produced it.
    execSync('npm run build:singlefile', { cwd: REPO_ROOT, stdio: 'pipe' });
    expect(existsSync(SINGLEFILE_PATH)).toBe(true);
  });

  test('starleap.html opened via file:// plays a complete game against Sirius with zero network requests', async ({
    page,
  }) => {
    test.setTimeout(10 * 60_000);

    const requestUrls: string[] = [];
    page.on('request', (req) => requestUrls.push(req.url()));

    await page.goto(`file://${SINGLEFILE_PATH}`);
    await expect(page.getByTestId('menu-screen')).toBeVisible();

    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByTestId('config-screen')).toBeVisible();
    await page.locator('[data-testid="seat-config-1"] select').selectOption('Sirius');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    await playUntilGameOver(page);
    await expect(page.getByTestId('win-screen')).toBeVisible();

    // The only two "requests" Playwright ever sees for a fully self-contained document are the
    // initial `file://` navigation and the browser resolving the `blob:` URL used to instantiate
    // the AI worker (see DECISIONS.md on why the worker must be a blob URL under `file://`) —
    // both are local, already-in-memory resources, not real network access. Anything else (a
    // real http(s) URL, a data: fetch for something unaccounted for, etc.) is a genuine leak.
    const initialLoad = `file://${SINGLEFILE_PATH}`;
    const unexpected = requestUrls.filter((url) => url !== initialLoad && !url.startsWith('blob:'));
    expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([]);
  });
});

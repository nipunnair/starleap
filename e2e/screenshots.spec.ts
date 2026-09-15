import { test, expect } from '@playwright/test';
import { playUntilGameOver } from './helpers';

/**
 * IMPLEMENTATION_PLAN.md P5.8: 8 key-state screenshots. Saved as plain artifacts (not
 * `toHaveScreenshot()` pixel-diff baselines) — see DECISIONS.md: gameplay involves real
 * randomness (Nova's noise, AI search timing), so board-state screenshots are never bit-for-bit
 * reproducible across runs, which would make a strict visual-regression baseline permanently
 * flaky. Each test's real assertion is that the state is reachable and renders without error;
 * the screenshot is the artifact a human would review for "does this look right."
 */
const outDir = 'test-results/screenshots';

test.describe('Screenshot gate (IMPLEMENTATION_PLAN.md P5.8)', () => {
  test('1. menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await page.screenshot({ path: `${outDir}/01-menu.png` });
  });

  test('2. board-idle', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await page.screenshot({ path: `${outDir}/02-board-idle.png` });
  });

  test('3. peg-selected', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await expect(peg.locator('circle[stroke="#ffffff"]')).toHaveCount(1);
    await page.screenshot({ path: `${outDir}/03-peg-selected.png` });
  });

  test('4. path-preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await page.locator('[data-testid^="peg-p0-"]').first().click();
    await page.locator('circle[stroke="#50c88c"]').first().hover();
    await expect(page.locator('[data-testid="path-preview-step"], [data-testid="path-preview-chain"]')).toHaveCount(1);
    await page.screenshot({ path: `${outDir}/04-path-preview.png` });
  });

  test('5. mid-hop-apex', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await page.locator('[data-testid^="peg-p0-"]').first().click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    // A single-cell step's duration is ~190ms (SPEC §4.1); sample near its midpoint.
    await page.waitForTimeout(95);
    await expect(page.getByTestId('animated-peg')).toHaveCount(1);
    await page.screenshot({ path: `${outDir}/05-mid-hop-apex.png` });
  });

  test('6. landing-juice', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await page.locator('[data-testid^="peg-p0-"]').first().click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    // Just after landing, while the ripple is still fading (RIPPLE_DURATION_MS = 500).
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${outDir}/06-landing-juice.png` });
  });

  test('7. win-screen', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await playUntilGameOver(page);
    await expect(page.getByTestId('win-screen')).toBeVisible();
    await page.screenshot({ path: `${outDir}/07-win-screen.png` });
  });

  test('8. reduced-motion board', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await page.screenshot({ path: `${outDir}/08-reduced-motion-board.png` });
  });
});

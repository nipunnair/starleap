import { test, expect } from '@playwright/test';
import { playUntilGameOver, waitForMoveRoundTrip } from './helpers';

test.describe('Full phase gate (IMPLEMENTATION_PLAN.md P7.9)', () => {
  test('config -> play -> quit -> resume -> finish', async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByTestId('config-screen')).toBeVisible();
    await page.locator('input[name="playerCount"][value="2"]').check();
    await page.getByTestId('seat-config-0').locator('select').selectOption('human');
    await page.getByTestId('seat-config-1').locator('select').selectOption('Nova');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Play a few moves.
    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page); // human
    await waitForMoveRoundTrip(page); // Nova

    // Quit mid-game.
    await page.getByRole('button', { name: 'Quit' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();

    // Resume.
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Finish.
    await playUntilGameOver(page);
    await expect(page.getByTestId('win-screen')).toBeVisible();
    await expect(page.getByTestId('post-game-stats')).toBeVisible();
  });
});

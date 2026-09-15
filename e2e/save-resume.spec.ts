import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('Save/resume (IMPLEMENTATION_PLAN.md P7.7)', () => {
  test('resuming restores the exact board state that was saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page); // human's move
    await waitForMoveRoundTrip(page); // Nova's reply

    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const positionsBeforeQuit = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    await page.getByRole('button', { name: 'Quit' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const positionsAfterResume = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));
    expect(positionsAfterResume.sort()).toEqual(positionsBeforeQuit.sort());
  });

  test('a versioned-key mismatch is treated as no save, not a crash', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('starleap.save.v0-not-a-real-version', '{"garbage": true}'));
    await page.reload();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  });
});

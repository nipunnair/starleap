import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('Undo (IMPLEMENTATION_PLAN.md P7.6)', () => {
  test('undoing a human move restores the pre-move board', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Human vs Human' }).click();

    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const initialPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page);

    // Human vs Human has no AI to auto-respond, so it's now player 1's pass screen.
    await expect(page.getByTestId('pass-and-play-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Ready' }).click();

    await expect(page.getByTestId('undo-button')).toBeVisible();
    await page.getByTestId('undo-button').click();

    // Undo reverts currentPlayer back to 0 — since pass-and-play can't assume the device has
    // been physically handed back, this correctly re-triggers a "pass to player 0" prompt.
    if (await page.getByTestId('pass-and-play-screen').isVisible()) {
      await page.getByRole('button', { name: 'Ready' }).click();
    }

    const restoredPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));
    expect(restoredPositions.sort()).toEqual(initialPositions.sort());

    // Single-level: the button is gone once used.
    await expect(page.getByTestId('undo-button')).toHaveCount(0);
  });

  test('undo is not offered once the opponent has replied', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page); // human's move
    await waitForMoveRoundTrip(page); // Nova's reply

    await expect(page.getByTestId('undo-button')).toHaveCount(0);
  });
});

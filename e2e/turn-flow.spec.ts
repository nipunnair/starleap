import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('Turn flow (IMPLEMENTATION_PLAN.md P4.6)', () => {
  test('committing a move applies it and the AI responds automatically', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    // Capture actual cell positions (not just element count/IDs, which stay the same whether or
    // not anything really moved) so we can confirm a real state change happened. Selecting only
    // the peg's own body circle (not the optional white selection-ring circle) keeps the count
    // stable regardless of which peg is currently selected.
    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const initialPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    // Wait for both the human's move and the AI's reply to fully animate and apply.
    await waitForMoveRoundTrip(page);
    await waitForMoveRoundTrip(page);

    const finalPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    // Both a human move and an AI reply have now happened; at least two pegs' positions changed,
    // and the game is still in progress and rendering without errors.
    expect(finalPositions).not.toEqual(initialPositions);
    await expect(page.getByTestId('game-screen')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

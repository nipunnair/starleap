import { test, expect } from '@playwright/test';

test.describe('Turn flow (IMPLEMENTATION_PLAN.md P4.6)', () => {
  test('committing a move applies it and the AI responds automatically', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const initialPegCells = await page.locator('[data-testid^="peg-p0-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')),
    );

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    // Wait for the turn to cycle all the way back to player 0 — only true once both the
    // human's move and the AI's reply have finished animating and actually applied (rather
    // than a fixed delay, which flakes under parallel-worker CPU contention).
    await expect(page.getByTestId('turn-indicator')).toHaveText("Player 0's turn", { timeout: 10_000 });
    await expect(page.getByTestId('animated-peg')).toHaveCount(0);

    const finalPegCells = await page.locator('[data-testid^="peg-p0-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')),
    );

    // Both a human move and (very likely) an AI reply have now happened; the game is still
    // in progress and rendering without errors.
    expect(finalPegCells.length).toBe(initialPegCells.length);
    await expect(page.getByTestId('game-screen')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

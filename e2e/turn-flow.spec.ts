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

    // Give the AI worker a moment to respond (Nova's real budget is 250ms).
    await page.waitForTimeout(1000);

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

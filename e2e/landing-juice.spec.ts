import { test, expect } from '@playwright/test';

test.describe('Landing juice (IMPLEMENTATION_PLAN.md P5.6)', () => {
  test('the particle canvas overlay renders above the board during a game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const canvas = page.getByTestId('particle-canvas');
    await expect(canvas).toBeVisible();
  });

  test('a hop does not throw and the canvas survives the move', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    await expect(page.getByTestId('turn-indicator')).toHaveText("Player 0's turn", { timeout: 10_000 });

    await expect(page.getByTestId('particle-canvas')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';

test.describe('prefers-reduced-motion (IMPLEMENTATION_PLAN.md P5.7 / SPEC.md §4.8)', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('a hop resolves instantly with no console errors under prefers-reduced-motion', async ({ page }) => {
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

    // Under reduced motion, AnimatedPeg resolves synchronously within one animation frame
    // rather than playing a multi-hundred-ms arc — the turn should cycle back quickly.
    await expect(page.getByTestId('turn-indicator')).toHaveText("Player 0's turn", { timeout: 5_000 });
    expect(consoleErrors).toEqual([]);
  });
});

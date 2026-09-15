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

    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const initialPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    // Under reduced motion, AnimatedPeg resolves synchronously within one animation frame
    // rather than playing a multi-hundred-ms arc — confirmed by a changed peg position within a
    // short poll (not by turn-indicator text, which also reads "Player 0's turn" before
    // anything has happened, since player 0 moves first).
    await expect
      .poll(
        async () =>
          page.locator(pegCircleSelector).evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`)),
        { timeout: 1_000 },
      )
      .not.toEqual(initialPositions);
    expect(consoleErrors).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Settings (IMPLEMENTATION_PLAN.md P7.3)', () => {
  test('toggling sound and reduced motion persists across a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();

    await page.locator('input[type="checkbox"]').uncheck();
    await page.locator('input[name="reducedMotion"][value="on"]').check();
    await page.locator('input[name="theme"][value="nakshatra"]').check();

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(page.locator('input[name="reducedMotion"][value="on"]')).toBeChecked();
    await expect(page.locator('input[name="theme"][value="nakshatra"]')).toBeChecked();
  });

  test('reduced-motion "on" override makes a hop resolve instantly even without OS reduced motion', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('input[name="reducedMotion"][value="on"]').check();
    await page.getByRole('button', { name: 'Back' }).click();

    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const initialPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();

    // Under reduced motion, AnimatedPeg resolves synchronously — well within a normal
    // multi-hundred-ms hop duration — so a short poll for a changed position (not a wait for
    // turn-indicator text, which also reads "Player 0's turn" before anything has happened)
    // both confirms the move completed and that it did so fast.
    await expect
      .poll(
        async () =>
          page.locator(pegCircleSelector).evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`)),
        { timeout: 1_000 },
      )
      .not.toEqual(initialPositions);
  });
});

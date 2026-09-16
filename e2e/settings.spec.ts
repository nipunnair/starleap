import { test, expect } from '@playwright/test';

test.describe('Settings (IMPLEMENTATION_PLAN.md P7.3)', () => {
  test('toggling sound and reduced motion persists across a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();

    await page.locator('input[name="audioEnabled"]').uncheck();
    await page.locator('input[name="showMoveHints"]').uncheck();
    await page.locator('input[name="reducedMotion"][value="on"]').check();
    await page.locator('input[name="theme"][value="nakshatra"]').check();

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('input[name="audioEnabled"]')).not.toBeChecked();
    await expect(page.locator('input[name="showMoveHints"]')).not.toBeChecked();
    await expect(page.locator('input[name="reducedMotion"][value="on"]')).toBeChecked();
    await expect(page.locator('input[name="theme"][value="nakshatra"]')).toBeChecked();
  });

  test('show move hints is on by default and hides destination highlighting/path preview when turned off, without breaking click routing (IMPLEMENTATION_PLAN.md P11.4)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('input[name="showMoveHints"]')).toBeChecked();
    await page.getByRole('button', { name: 'Back' }).click();

    // With hints on, find a legal destination's cell key so we know which (now-unhighlighted)
    // cell to click once hints are turned off.
    await page.getByRole('button', { name: 'Human vs Human' }).click();
    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destinationCellKey = await page.locator('circle[stroke="#50c88c"]').first().getAttribute('data-cell');
    expect(destinationCellKey).not.toBeNull();
    await page.getByRole('button', { name: 'Quit' }).click();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('input[name="showMoveHints"]').uncheck();
    await page.getByRole('button', { name: 'Back' }).click();

    await page.getByRole('button', { name: 'Human vs Human' }).click();
    await page.locator('[data-testid^="peg-p0-"]').first().click();

    // No destination highlight circle and no path-preview markers should render...
    await expect(page.locator('circle[stroke="#50c88c"]')).toHaveCount(0);
    await page.locator(`[data-testid="cell-${destinationCellKey}"]`).hover();
    await expect(page.locator('[data-testid="path-preview-step"], [data-testid="path-preview-chain"]')).toHaveCount(0);

    // ...but clicking the same (now-unhighlighted) legal destination cell still commits the
    // move, since click routing doesn't depend on the hint styling.
    const pegCircleSelector = '[data-testid^="peg-"] circle[stroke="rgba(0,0,0,0.35)"]';
    const initialPositions = await page
      .locator(pegCircleSelector)
      .evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`));
    await page.locator(`[data-testid="cell-${destinationCellKey}"]`).click();
    await expect
      .poll(async () =>
        page.locator(pegCircleSelector).evaluateAll((els) => els.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`)),
      )
      .not.toEqual(initialPositions);
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

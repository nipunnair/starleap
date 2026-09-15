import { test, expect } from '@playwright/test';

test.describe('Pass-and-play (IMPLEMENTATION_PLAN.md P4.7)', () => {
  test('a two-human game shows a pass screen between turns', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Human vs Human' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    await expect(page.getByTestId('pass-and-play-screen')).toBeVisible();
    await expect(page.getByText('Pass the device to Player 1')).toBeVisible();

    await page.getByRole('button', { name: 'Ready' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();
  });

  test('a single-human game (vs Nova) never shows a pass screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    await page.waitForTimeout(500);
    await expect(page.getByTestId('pass-and-play-screen')).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Game config (IMPLEMENTATION_PLAN.md P7.2)', () => {
  test('configuring 4 players shows 4 seat selectors and starts the game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByTestId('config-screen')).toBeVisible();

    await page.locator('input[name="playerCount"][value="4"]').check();
    await expect(page.getByTestId('seat-config-0')).toBeVisible();
    await expect(page.getByTestId('seat-config-3')).toBeVisible();
    await expect(page.getByTestId('seat-config-4')).toHaveCount(0);

    await page.getByTestId('seat-config-1').locator('select').selectOption('human');
    await page.getByRole('button', { name: 'Start game' }).click();

    await expect(page.getByTestId('game-screen')).toBeVisible();
    await expect(page.locator('[data-testid^="peg-"]')).toHaveCount(40); // 4 players x 10 pegs
  });

  test('Back returns to the menu without starting a game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  });
});

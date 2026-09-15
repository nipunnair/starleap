import { test, expect } from '@playwright/test';
import { playUntilGameOver } from './helpers';

test.describe('Win screen (IMPLEMENTATION_PLAN.md P4.8)', () => {
  test('shows a ranking for both players once the game ends', async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    await playUntilGameOver(page);

    await expect(page.getByTestId('win-screen')).toBeVisible();
    await expect(page.getByTestId('ranking-0')).toBeVisible();
    await expect(page.getByTestId('ranking-1')).toBeVisible();

    await page.getByRole('button', { name: 'Back to menu' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  });
});

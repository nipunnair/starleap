import { test, expect } from '@playwright/test';

test.describe('Responsive layout at 360px (IMPLEMENTATION_PLAN.md P8.1)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('menu and game screen render with no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('menu-screen')).toBeVisible();

    const menuOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(menuOverflow).toBe(false);

    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const gameOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(gameOverflow).toBe(false);
  });

  test('config screen renders with no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByTestId('config-screen')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});

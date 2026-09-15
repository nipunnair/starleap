import { test, expect } from '@playwright/test';

test.describe('Rules screen (IMPLEMENTATION_PLAN.md P7.4)', () => {
  test('shows player-facing rules text and returns to the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Rules' }).click();
    await expect(page.getByTestId('rules-screen')).toBeVisible();
    await expect(page.getByText('Long jumps')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  });
});

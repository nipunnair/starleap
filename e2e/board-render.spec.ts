import { test, expect } from '@playwright/test';

test.describe('Board rendering (IMPLEMENTATION_PLAN.md P4.2)', () => {
  test('renders all 121 cells and 20 pegs for a 2-player game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const cells = page.getByRole('group', { name: /STARLEAP board/ }).locator('circle[data-cell]');
    await expect(cells).toHaveCount(121);

    const pegs = page.locator('[data-testid^="peg-"]');
    await expect(pegs).toHaveCount(20);
  });
});

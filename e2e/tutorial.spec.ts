import { test, expect } from '@playwright/test';

test.describe('Interactive tutorial (IMPLEMENTATION_PLAN.md P7.5)', () => {
  test('walks through a step and a long jump, then completes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
    await expect(page.getByTestId('tutorial-screen')).toBeVisible();

    // Stage 1: step.
    await page.locator('[data-testid^="peg-"]').first().click();
    await page.locator('circle[stroke="#50c88c"]').first().click();

    // Stage 2: long jump — click the peg, then the far (jump-landing) destination.
    await expect(page.getByTestId('tutorial-instruction')).toContainText('long jump');
    await page.locator('[data-testid^="peg-"]').first().click();
    const destinations = page.locator('circle[stroke="#50c88c"]');
    await expect(destinations).toHaveCount(7); // 6 steps + 1 jump landing (verified in DECISIONS.md)
    // The jump lands at (4,-4,0) — the only destination two cells removed from every step option.
    await page.locator('circle[data-cell="4,-4,0"][stroke="#50c88c"]').click();

    await expect(page.getByText('Tutorial complete')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  });

  test('Skip tutorial returns to the menu immediately', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  });
});

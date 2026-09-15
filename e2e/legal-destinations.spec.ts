import { test, expect } from '@playwright/test';

test.describe('Legal destination highlighting (IMPLEMENTATION_PLAN.md P4.4)', () => {
  test('selecting a peg highlights at least one legal destination cell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    // No highlighted destinations before any selection.
    await expect(page.locator('circle[stroke="#50c88c"]')).toHaveCount(0);

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();

    const destinations = page.locator('circle[stroke="#50c88c"]');
    await expect(destinations).not.toHaveCount(0);
  });

  test('highlights clear once the move is committed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    await expect(page.locator('circle[stroke="#50c88c"]')).toHaveCount(0);
  });
});

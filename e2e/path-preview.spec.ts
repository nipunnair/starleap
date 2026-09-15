import { test, expect } from '@playwright/test';

test.describe('Path preview (IMPLEMENTATION_PLAN.md P4.5)', () => {
  test('hovering a legal destination shows a path preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();

    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.hover();

    const preview = page.locator('[data-testid="path-preview-step"], [data-testid="path-preview-chain"]');
    await expect(preview).toHaveCount(1);
  });

  test('moving the mouse away clears the preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.hover();
    await expect(page.locator('[data-testid="path-preview-step"], [data-testid="path-preview-chain"]')).toHaveCount(1);

    // Move to a neutral cell far from the board's destinations.
    await page.locator('circle[data-cell="0,0,0"]').hover();
    await expect(page.locator('[data-testid="path-preview-step"], [data-testid="path-preview-chain"]')).toHaveCount(0);
  });
});

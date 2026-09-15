import { test, expect } from '@playwright/test';

test.describe('Peg selection (IMPLEMENTATION_PLAN.md P4.3)', () => {
  test('clicking a peg belonging to the current player selects it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();

    // Selection renders a white ring circle as a sibling within the same <g>.
    const selectedRing = peg.locator('circle[stroke="#ffffff"]');
    await expect(selectedRing).toHaveCount(1);
  });

  test('clicking an empty non-destination cell deselects', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await expect(peg.locator('circle[stroke="#ffffff"]')).toHaveCount(1);

    // Click a far-away empty cell that is not a legal destination.
    const emptyCell = page.locator('circle[data-cell="0,0,0"]');
    await emptyCell.click();
    await expect(peg.locator('circle[stroke="#ffffff"]')).toHaveCount(0);
  });
});

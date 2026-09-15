import { test, expect } from '@playwright/test';

test.describe('Touch targets (IMPLEMENTATION_PLAN.md P8.2)', () => {
  test('menu buttons meet the 44px minimum', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('config screen form controls meet the 44px minimum', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    const controls = await page.locator('input, select, button').all();
    for (const control of controls) {
      const box = await control.boundingBox();
      if (!box) continue; // radio/checkbox inputs render via their <label> wrapper too
      expect(Math.min(box.height, box.width)).toBeGreaterThanOrEqual(44);
    }
  });
});

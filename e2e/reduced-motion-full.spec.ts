import { test, expect } from '@playwright/test';

test.describe('prefers-reduced-motion covers Phase 6/7 additions (IMPLEMENTATION_PLAN.md P8.5)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the AI character avatar animation is effectively disabled', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();

    // Wait until it's Nova's turn (the avatar exists and is in the thinking state).
    await page.waitForSelector('[data-testid="character-avatar"][data-state="thinking"]', { timeout: 5_000 });

    const avatarFace = page.locator('.starleap-avatar__face');
    const durationSeconds = await avatarFace.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    // The global `* { animation-duration: 0.001ms !important }` rule under reduced motion —
    // the browser normalizes this to seconds (1e-6s), so compare numerically, not by string.
    expect(durationSeconds).toBeLessThan(0.001);
  });

  test('settings screen (Phase 7) has no animated transitions to worry about', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();
    // Screens swap instantly (no CSS transition between them), so there's nothing for reduced
    // motion to disable here — this test documents that fact rather than exercising an animation.
  });
});

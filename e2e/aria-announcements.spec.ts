import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('Screen-reader move announcements (IMPLEMENTATION_PLAN.md P8.4)', () => {
  test('an aria-live region announces each committed move in plain language', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const announcer = page.getByTestId('move-announcer');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');
    await expect(announcer).toHaveText('');

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page); // human's move

    await expect(announcer).toContainText('Player 0');
    await expect(announcer).toContainText('cell');

    await waitForMoveRoundTrip(page); // Nova's reply
    await expect(announcer).toContainText('Nova');
  });
});

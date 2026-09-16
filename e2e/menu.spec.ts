import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('Main menu (IMPLEMENTATION_PLAN.md P7.1)', () => {
  test('shows new game, rules, settings, and tutorial — no resume without a save', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rules' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tutorial', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  });

  test('shows Resume once a game has been saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    // Committing a move triggers an autosave. Wait for the human's move to fully animate and
    // apply (not just for the turn-indicator text, which also reads "Player 0's turn" before
    // anything has happened, since player 0 moves first).
    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page);

    await page.getByRole('button', { name: 'Quit' }).click();
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  });
});

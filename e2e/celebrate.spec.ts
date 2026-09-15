import { test, expect } from '@playwright/test';

/**
 * IMPLEMENTATION_PLAN.md P6.5: celebrate fires when the AI completes its win condition. Uses
 * the `?e2eScenario=almostWon` debug fixture (one step from winning, Rigel as the AI — Nova's
 * 35% noise makes it unreliably choose the winning move even when available, measured ~65% win
 * rate vs Rigel/Sirius's 100% — see DECISIONS.md) since waiting for a natural win within a
 * test's time budget isn't practical, and this specifically exercises the celebrate transition
 * without needing a full game.
 */
test.describe('Celebrate trigger (IMPLEMENTATION_PLAN.md P6.5 / SPEC.md §4.7)', () => {
  test('the AI avatar celebrates before the win screen appears', async ({ page }) => {
    await page.goto('/?e2eScenario=almostWon');
    await expect(page.getByTestId('game-screen')).toBeVisible();

    let sawCelebrate = false;
    for (let i = 0; i < 100; i++) {
      if (await page.getByTestId('win-screen').isVisible()) break;
      const state = await page.getByTestId('character-avatar').getAttribute('data-state');
      if (state === 'celebrate') {
        sawCelebrate = true;
        break;
      }
      await page.waitForTimeout(50);
    }

    expect(sawCelebrate).toBe(true);
    await expect(page.getByTestId('win-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('ranking-1')).toContainText('10 pegs home');
  });
});

import { test, expect } from '@playwright/test';
import { playUntilGameOver } from './helpers';

test.describe('Post-game stats (IMPLEMENTATION_PLAN.md P7.8)', () => {
  test('shows move count, longest chain, and duration once the game ends', async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await playUntilGameOver(page);

    await expect(page.getByTestId('win-screen')).toBeVisible();
    await expect(page.getByTestId('post-game-stats')).toBeVisible();

    const plyCount = Number(await page.getByTestId('stat-ply-count').textContent());
    expect(plyCount).toBeGreaterThan(0);

    const longestChainText = await page.getByTestId('stat-longest-chain').textContent();
    expect(longestChainText).toMatch(/^\d+ hops$/);

    const durationText = await page.getByTestId('stat-duration').textContent();
    expect(durationText).toMatch(/^\d+s$/);
  });
});

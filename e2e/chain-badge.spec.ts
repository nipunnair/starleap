import { test, expect } from '@playwright/test';

/**
 * IMPLEMENTATION_PLAN.md P11.7: a transient chain-hop counter badge appears after a 2+-hop move
 * and disappears again on its own. Uses the `?e2eScenario=sevenHopChain` debug fixture (see
 * src/app/debugScenarios.ts) since a natural 7-hop chain doesn't reliably occur within a test's
 * time budget — the same fixture P5.9's performance gate uses.
 */
test.describe('Chain-hop counter badge (IMPLEMENTATION_PLAN.md P11.7)', () => {
  test('shows a per-move hop count after a long chain and clears itself', async ({ page }) => {
    await page.goto('/?e2eScenario=sevenHopChain');
    await expect(page.getByTestId('game-screen')).toBeVisible();

    await expect(page.getByTestId('chain-badge')).toHaveCount(0);

    await page.getByTestId('peg-mover').click();
    const sevenHopDestination = page.locator('circle[data-cell="-2,0,2"][stroke="#50c88c"]');
    await expect(sevenHopDestination).toHaveCount(1);
    await sevenHopDestination.click();

    await expect(page.getByTestId('animated-peg')).toHaveCount(0, { timeout: 10_000 });

    // The fixture seats all 6 players as human, so committing player 0's move immediately
    // triggers the pass-and-play screen for the next player — dismiss it to get back to the
    // game screen, where the badge (set in the same commit that triggered the pass screen,
    // and preserved since GameScreen itself never unmounts) should still be showing.
    const passScreen = page.getByTestId('pass-and-play-screen');
    if (await passScreen.isVisible()) {
      await page.getByRole('button', { name: 'Ready' }).click();
    }

    await expect(page.getByTestId('chain-badge')).toHaveText('Red: 7-hop chain!');
    await expect(page.getByTestId('chain-badge')).toHaveCount(0, { timeout: 5_000 });
  });
});

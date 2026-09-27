import { test, expect } from '@playwright/test';

/**
 * Regression test for a bug a player found in production: a player who had already finished (all
 * ten pegs resting in their own target corner) kept taking normal turns forever, including being
 * forced to move an already-home peg back out — undoing their own win the moment their turn came
 * back around. SPEC.md §2.6: the game "continues for the remaining players" once someone
 * finishes, which means the finished player sits out, not that they keep playing. See
 * `skipFinishedPlayers` (engine/apply.ts) and DECISIONS.md.
 *
 * Uses the `?e2eScenario=onePlayerFinished` fixture: player 0 (Sirius) starts already finished
 * and, deliberately, as `currentPlayer` — the fixture exercises the skip firing right at mount,
 * not only mid-game.
 */
test.describe('A finished player sits out (regression)', () => {
  test('is skipped immediately, shown celebrating, and stays skipped as turns cycle back around', async ({
    page,
  }) => {
    await page.goto('/?e2eScenario=onePlayerFinished');
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const finishedBadge = page.locator('[data-testid="character-avatar"][data-tier="Sirius"]');
    await expect(finishedBadge).toHaveAttribute('data-state', 'celebrate');

    // The fixture's currentPlayer is 0 (Sirius, finished) — confirm it was skipped immediately on
    // mount, landing on player 1 (human, "Blue") rather than ever showing Sirius as active.
    const turnIndicator = page.getByTestId('turn-indicator');
    await expect(turnIndicator).toContainText('Blue');
    await expect(turnIndicator).not.toContainText('Sirius');

    // Play the human's (player 1's) move, then watch a full round cycle through player 2
    // (Rigel) and back to player 0 — which must be skipped again, not become active.
    await page.locator('[data-testid^="peg-p1-"]').first().click();
    await page.locator('circle[stroke="#50c88c"]').first().click();

    let sawRigelTurn = false;
    let sawReturnToHuman = false;
    for (let i = 0; i < 300 && !sawReturnToHuman; i++) {
      const [turnText, badgeState] = await Promise.all([
        turnIndicator.textContent(),
        finishedBadge.getAttribute('data-state'),
      ]);
      expect(turnText, 'the finished player must never become the active turn again').not.toContain('Sirius');
      expect(badgeState, "the finished player's badge must stay celebrating, not idle/thinking/etc").toBe('celebrate');
      if (turnText?.includes('Rigel')) sawRigelTurn = true;
      if (sawRigelTurn && turnText?.includes('Blue')) sawReturnToHuman = true;
      await page.waitForTimeout(50);
    }

    expect(sawRigelTurn, 'player 2 (Rigel) never got a turn — the round never actually progressed').toBe(true);
    expect(sawReturnToHuman, 'the turn never cycled back to player 1 after player 0 was (correctly) skipped').toBe(
      true,
    );
  });
});

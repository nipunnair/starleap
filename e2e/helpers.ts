import type { Page } from '@playwright/test';

/**
 * Drives a human-vs-Nova game (human is always player 0) by picking the first legal
 * destination for the first peg that has any, every time it's the human's turn. Used by the
 * win-screen and full-game gates — this proves the UI plumbing works end to end, not that the
 * human plays well (AI quality is already verified headlessly in Phase 2/3).
 */
export async function playUntilGameOver(page: Page, maxIterations = 400): Promise<void> {
  for (let i = 0; i < maxIterations; i++) {
    if (await page.getByTestId('win-screen').isVisible()) return;

    const turnText = (await page.getByTestId('turn-indicator').textContent()) ?? '';
    if (!turnText.startsWith('Player 0')) {
      await page.waitForTimeout(80);
      continue;
    }

    const pegs = await page.locator('[data-testid^="peg-p0-"]').all();
    let moved = false;
    for (const peg of pegs) {
      await peg.click();
      const destinations = page.locator('circle[stroke="#50c88c"]');
      if ((await destinations.count()) > 0) {
        await destinations.first().click();
        moved = true;
        break;
      }
    }
    if (!moved) {
      throw new Error('player 0 had no legal move on their own turn');
    }
  }

  throw new Error(`game did not reach a terminal state within ${maxIterations} iterations`);
}

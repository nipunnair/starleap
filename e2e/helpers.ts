import type { Page } from '@playwright/test';

/**
 * Drives a human-vs-Nova game (human is always player 0) by picking the first legal
 * destination for the first peg that has any, every time it's the human's turn. Used by the
 * win-screen and full-game gates — this proves the UI plumbing works end to end, not that the
 * human plays well (AI quality is already verified headlessly in Phase 2/3).
 *
 * Waits event-driven (via waitForFunction) rather than fixed-interval polling: a move (human's
 * or AI's) may be mid-animation, during which the turn indicator's text hasn't flipped yet
 * (currentPlayer only advances once the animation completes) — a fixed-delay poll loop wastes
 * most of its iteration budget on "not ready yet" checks under real hop-animation timing.
 */
export async function playUntilGameOver(page: Page, maxMoves = 200): Promise<void> {
  for (let movesMade = 0; movesMade < maxMoves; movesMade++) {
    const handle = await page.waitForFunction(
      () => {
        if (document.querySelector('[data-testid="win-screen"]')) return 'done';
        if (document.querySelector('[data-testid="animated-peg"]')) return null;
        const turnText = document.querySelector('[data-testid="turn-indicator"]')?.textContent ?? '';
        return turnText.startsWith('Player 0') ? 'ready' : null;
      },
      undefined,
      { timeout: 30_000 },
    );
    const outcome = await handle.jsonValue();
    if (outcome === 'done') return;

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

  throw new Error(`game did not reach a terminal state within ${maxMoves} human moves`);
}

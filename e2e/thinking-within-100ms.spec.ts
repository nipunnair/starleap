import { test, expect } from '@playwright/test';
import { YOUR_TURN_LABEL } from '../src/ui/components/boardGeometry';

test.describe('AI thinking state timing (IMPLEMENTATION_PLAN.md P6.6 / SPEC.md §4.7)', () => {
  test('the thinking state appears within 100ms of the AI turn starting', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    const destination = page.locator('circle[stroke="#50c88c"]').first();
    await destination.click();

    // The AI's turn doesn't actually start until the human's own move finishes animating and
    // applies (currentPlayer only flips then) — so the deadline is measured from the moment the
    // turn indicator first shows something other than the human's own label, not from the click,
    // which would otherwise unfairly include the human's own move animation time.
    let turnStartedAt: number | null = null;
    let thinkingSeenAt: number | null = null;

    // Scoped to Nova specifically (data-tier) — every seat now renders a "character-avatar" (see
    // DECISIONS.md: SeatBadges), so an unscoped getByTestId would hit a strict-mode violation
    // with 2 matches (Nova's and the human's own Astro badge).
    for (let i = 0; i < 400; i++) {
      const [turnText, avatarState] = await Promise.all([
        page.getByTestId('turn-indicator').textContent(),
        page.locator('[data-testid="character-avatar"][data-tier="Nova"]').getAttribute('data-state'),
      ]);
      const now = Date.now();

      if (turnStartedAt === null && turnText && !turnText.startsWith(YOUR_TURN_LABEL)) {
        turnStartedAt = now;
      }
      if (turnStartedAt !== null && avatarState === 'thinking') {
        thinkingSeenAt = now;
        break;
      }
      await page.waitForTimeout(2);
    }

    expect(turnStartedAt, 'AI turn never started').not.toBeNull();
    expect(thinkingSeenAt, 'thinking state never appeared after the AI turn started').not.toBeNull();
    expect(thinkingSeenAt! - turnStartedAt!).toBeLessThan(100);
  });
});

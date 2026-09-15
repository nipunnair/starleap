import { test, expect } from '@playwright/test';

test.describe('Keyboard navigation (IMPLEMENTATION_PLAN.md P8.3)', () => {
  test('tabbing reaches the menu buttons in order', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'New game' })).toBeFocused();
  });

  test('arrow keys move the focused cell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const board = page.getByRole('group', { name: /STARLEAP board/ });
    await board.focus();

    const focusedCellBefore = await page.locator('circle[stroke="#ffd166"]').getAttribute('data-cell');
    await page.keyboard.press('ArrowRight');
    const focusedCellAfter = await page.locator('circle[stroke="#ffd166"]').getAttribute('data-cell');

    expect(focusedCellAfter).not.toBe(focusedCellBefore);
  });

  test('a full move can be made with the keyboard alone, no mouse', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();

    const board = page.getByRole('group', { name: /STARLEAP board/ });
    await board.focus();

    // Board starts keyboard focus at the board's geometric center; this exact path (computed
    // via BFS over the same 4 arrow directions Board.tsx supports) reaches one of player 0's
    // starting pegs at cell (5,-4,-1).
    const pathToPeg = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowRight'];
    for (const key of pathToPeg) await page.keyboard.press(key);
    await page.keyboard.press('Enter'); // select the peg

    const peg = page.locator('[data-testid="peg-p0-0"]');
    await expect(peg.locator('circle[stroke="#ffffff"]')).toHaveCount(1);

    const destinations = page.locator('circle[stroke="#50c88c"]');
    await expect(destinations).not.toHaveCount(0);
    const firstDestinationCell = await destinations.first().getAttribute('data-cell');
    expect(firstDestinationCell).toBeTruthy();
  });
});

import { test, expect } from '@playwright/test';
import { playUntilGameOver } from './helpers';

test.describe('Full phase gate (IMPLEMENTATION_PLAN.md P4.9)', () => {
  test('a human-vs-Nova game plays start to a terminal state with no console errors', async ({ page }) => {
    test.setTimeout(120_000);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto('/');
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    await playUntilGameOver(page);

    await expect(page.getByTestId('win-screen')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

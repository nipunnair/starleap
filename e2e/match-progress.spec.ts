import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const width of [360, 1280]) {
  test(`home counts and targets at ${width}px preserve keyboard and legal hints`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('home-progress-0')).toHaveText('You: Home 0/10 · Target D');
    await expect(page.getByTestId('home-progress-1')).toHaveText('Nova: Home 0/10 · Target A');
    await expect(page.getByRole('region', { name: 'Home progress and targets' })).toContainText('waypoints only');
    await expect(page.locator('[data-testid^="corner-label-"]')).toHaveCount(6);
    const board = page.getByRole('group', { name: /STARLEAP board/ });
    await board.focus();
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowRight', 'Enter']) await page.keyboard.press(key);
    await expect(page.locator('circle[stroke="#50c88c"]')).not.toHaveCount(0);
    await expect(board).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mkdir('artifacts/family-pilot', { recursive: true });
    await page.screenshot({ path: `artifacts/family-pilot/p145-${width}.png`, fullPage: true });
  });
}
test('finished seats show all ten home in multiplayer', async ({ page }) => {
  await page.goto('/?e2eScenario=onePlayerFinished');
  await expect(page.getByTestId('home-progress-0')).toContainText('Home 10/10');
  await expect(page.getByTestId('home-progress-1')).toContainText('Home 0/10');
});

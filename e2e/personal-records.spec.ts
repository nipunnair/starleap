import { test, expect, type Page } from '@playwright/test';
import { outcome } from '../src/progression/__tests__/recordFixture';

async function resume(page: Page, saved = outcome()) {
  await page.goto('/');
  await page.evaluate(save => localStorage.setItem('starleap.pending-result.v2', JSON.stringify(save)), saved);
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('win-screen')).toBeVisible();
}
test('personal stats and genuine improvements survive reload; rematch starts a new session', async ({ page }) => {
  await resume(page);
  await expect(page.getByTestId('personal-results')).toContainText('Your moves: 30');
  await expect(page.getByTestId('personal-results')).toContainText('Your longest chain: 3 hops');
  await expect(page.getByTestId('new-best-moves')).toBeVisible();
  await expect(page.getByTestId('new-best-chain')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('earned-badge')).toContainText('Nova');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('starleap.progress.v1')!).receipts.length)).toBe(1);
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('starleap.save.v2')!).snapshot.stats.context.sessionId)).not.toBe('one');
});
test('loss celebrates a human chain improvement without win praise', async ({ page }) => {
  await resume(page, outcome('loss', 1));
  await expect(page.getByTestId('new-best-chain')).toBeVisible();
  await expect(page.getByTestId('new-best-moves')).toHaveCount(0);
  await expect(page.getByTestId('earned-badge')).toHaveCount(0);
});
test('legacy history and failed storage are honest and nonblocking', async ({ page }) => {
  const legacy = outcome('legacy');
  legacy.snapshot.stats.historyComplete = false;
  await resume(page, legacy);
  await expect(page.getByTestId('personal-results')).toContainText('Earlier move history is unavailable');
  await expect(page.getByTestId('new-best-chain')).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'starleap.progress.v1') throw new Error('quota');
      return original.call(this, key, value);
    };
  });
  await resume(page);
  await expect(page.getByRole('status')).toContainText('Local progress could not be saved');
  await expect(page.getByTestId('earned-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
});

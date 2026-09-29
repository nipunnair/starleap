import { test, expect, type Page } from '@playwright/test';

const read = (page: Page, key = 'starleap.save.v2') => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
async function move(page: Page) {
  await page.locator('[data-testid^="peg-p0-"]').first().click();
  await page.locator('circle[stroke="#50c88c"]').first().click();
}

test('committed counters and undo survive reload without resetting identity or sequence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Human vs Human' }).click();
  await expect.poll(async () => (await read(page))?.snapshot.stats.lastEventSequence).toBe(0);
  const initial = await read(page);
  await move(page);
  await expect.poll(async () => (await read(page))?.snapshot.stats.lastEventSequence).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByTestId('undo-button').click();
  await expect.poll(async () => (await read(page))?.snapshot.stats.undoUsed).toBe(true);
  const undone = await read(page);
  expect(undone.gameState).toEqual(initial.gameState);
  expect(undone.snapshot.stats.seats).toEqual(initial.snapshot.stats.seats);
  expect(undone.snapshot.stats.lastEventSequence).toBe(1);
  expect(undone.snapshot.stats.context.sessionId).toBe(initial.snapshot.stats.context.sessionId);
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('undo-button')).toHaveCount(0);
  await move(page);
  await expect.poll(async () => (await read(page))?.snapshot.stats.lastEventSequence).toBe(2);
  expect((await read(page)).snapshot.stats.seats[0].moves).toBe(1);
});

test('reload during animation preserves the precommit board and zero score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Human vs Human' }).click();
  await expect.poll(async () => !!await read(page)).toBe(true);
  const before = await read(page);
  await page.clock.pauseAt(new Date());
  await move(page);
  expect((await read(page)).snapshot.stats.lastEventSequence).toBe(0);
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  expect((await read(page)).gameState).toEqual(before.gameState);
  expect((await read(page)).snapshot.stats.seats).toEqual(before.snapshot.stats.seats);
});

test('reload during AI thinking resumes one reply and attributes each move once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play vs Nova' }).click();
  await move(page);
  await expect.poll(async () => (await read(page))?.snapshot.stats.lastEventSequence, { intervals: [10] }).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(async () => (await read(page))?.snapshot.stats.lastEventSequence).toBe(2);
  expect((await read(page)).snapshot.stats.seats.map((s: { moves: number }) => s.moves)).toEqual([1, 1]);
});

test('terminal snapshot survives interruption before results and stays excluded as a debug fixture', async ({ page }) => {
  await page.goto('/?e2eScenario=almostWon');
  await expect.poll(async () => !!await read(page, 'starleap.pending-result.v2')).toBe(true);
  const result = await read(page, 'starleap.pending-result.v2');
  expect(result.snapshot.stats.context.mode).toBe('debug');
  expect(await read(page)).toBeNull();
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('win-screen')).toBeVisible();
  expect(await read(page, 'starleap.pending-result.v2')).toMatchObject({ snapshot: result.snapshot });
  await expect(page.getByTestId('stat-ply-count')).toHaveText('1');
});

test('malformed v2 save is ignored safely', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('starleap.save.v2', '{"version":2,"playerCount":2,"seats":["human","Nova"],"gameState":{}}'));
  await page.reload();
  await expect(page.getByTestId('menu-screen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
});

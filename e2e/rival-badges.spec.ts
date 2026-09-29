import { test, expect } from '@playwright/test';
import { outcome } from '../src/progression/__tests__/recordFixture';
import { emptyProgress, recordOutcome, RIVALS } from '../src/progression/records';

test('collection distinguishes unearned portraits from four earned badges', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rival badges / Personal bests', exact: true }).click();
  for (const tier of RIVALS) await expect(page.getByTestId(`badge-${tier}`)).toContainText('Not yet earned');
  let p = emptyProgress();
  for (const tier of RIVALS) {
    const o = outcome(tier, 0, { controllers: ['human', tier] });
    p = recordOutcome(p, o.snapshot.stats, o.gameState).progress;
  }
  await page.evaluate(progress => localStorage.setItem('starleap.progress.v1', JSON.stringify(progress)), p);
  await page.reload();
  await page.getByRole('button', { name: 'Rival badges / Personal bests', exact: true }).click();
  for (const tier of RIVALS) {
    await expect(page.getByTestId(`badge-${tier}`)).toContainText('Earned');
    await expect(page.getByTestId(`badge-${tier}`)).not.toContainText('Not yet earned');
  }
  await expect(page.getByTestId('progress-screen')).toContainText('Saved only in this browser');
  await expect(page.getByTestId('progress-screen')).toContainText('best win 30 moves');
});
test('next rival preserves human seat, and Sirius has no next rival', async ({ page }) => {
  for (const tier of ['Nova', 'Sirius'] as const) {
    const o = outcome(tier, 1, { controllers: [tier, 'human'] });
    await page.goto('/');
    await page.evaluate(save => {
      localStorage.removeItem('starleap.save.v2');
      localStorage.setItem('starleap.pending-result.v2', JSON.stringify(save));
    }, o);
    await page.reload();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    if (tier === 'Sirius') await expect(page.getByRole('button', { name: /Play next rival/ })).toHaveCount(0);
    else {
      await page.getByRole('button', { name: 'Play next rival: Vega' }).click();
      await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('starleap.save.v2')!).seats)).toEqual(['Vega', 'human']);
    }
  }
});

for (const rival of RIVALS) {
  test(`a committed human winning move earns the ${rival} badge once`, async ({ page }) => {
    const { buildAlmostWonScenario } = await import('../src/app/debugScenarios');
    const { generateLegalMoves } = await import('../src/engine/moves');
    const { applyMove } = await import('../src/engine/apply');
    const { hasWon } = await import('../src/engine/terminal');
    const { key } = await import('../src/engine/coords');
    const gameState = buildAlmostWonScenario();
    const saved = outcome(`finish-${rival}`, 1, { controllers: [rival, 'human'] });
    const active = { ...saved, gameState, snapshot: { ...saved.snapshot, game: gameState } };
    const winning = generateLegalMoves(gameState, 1).find(move => hasWon(applyMove(gameState, move), 1))!;
    await page.goto('/');
    await page.evaluate(save => localStorage.setItem('starleap.save.v2', JSON.stringify(save)), active);
    await page.reload();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByTestId(`peg-${winning.pegId}`).click();
    await page.getByTestId(`cell-${key(winning.to)}`).click();
    await expect(page.getByTestId('earned-badge')).toContainText(rival);
    await expect(page.getByTestId('personal-results')).toContainText('Your moves: 21');
    await page.reload();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByTestId('earned-badge')).toContainText(rival);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('starleap.progress.v1')!).receipts.length)).toBe(1);
  });
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Runs axe against every screen (IMPLEMENTATION_PLAN.md P8.7). Fails only on "critical" or
 * "serious" impact violations — "moderate"/"minor" findings are logged via console output from
 * the failure message but don't block the gate, matching the plan's "fix critical violations"
 * wording rather than requiring a zero-violation report across the whole app.
 */
function expectNoSeriousViolations(violations: Array<{ id: string; impact?: string | null; help: string; nodes: unknown[] }>) {
  const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe('Accessibility audit (IMPLEMENTATION_PLAN.md P8.7)', () => {
  test('menu screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('menu-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('config screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByTestId('config-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('rules screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Rules' }).click();
    await expect(page.getByTestId('rules-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('settings screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('tutorial screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
    await expect(page.getByTestId('tutorial-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('board / game screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });

  test('post-game stats / win screen', async ({ page }) => {
    // almostWon starts on player 1 (Rigel, the AI) one step from winning — no human move needed,
    // just wait for the AI's own winning move to land. See celebrate.spec.ts for the same fixture.
    await page.goto('/?e2eScenario=almostWon');
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await expect(page.getByTestId('win-screen')).toBeVisible({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).analyze();
    expectNoSeriousViolations(results.violations);
  });
});

for (const width of [360, 1280]) {
  test(`personal results and collection at ${width}px with reduced motion`, async ({ page }) => {
    const { outcome } = await import('../src/progression/__tests__/recordFixture');
    const { mkdir } = await import('node:fs/promises');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(save => localStorage.setItem('starleap.pending-result.v2', JSON.stringify(save)), outcome());
    await page.reload();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByTestId('earned-badge')).toBeVisible();
    expectNoSeriousViolations((await new AxeBuilder({ page }).analyze()).violations);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mkdir('artifacts/family-pilot', { recursive: true });
    await page.screenshot({ path: `artifacts/family-pilot/p146-results-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back to menu' }).click();
    await page.getByRole('button', { name: 'Rival badges / Personal bests', exact: true }).click();
    await expect(page.getByTestId('badge-Nova')).toContainText('Earned');
    expectNoSeriousViolations((await new AxeBuilder({ page }).analyze()).violations);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/family-pilot/p146-collection-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

import { test, expect } from '@playwright/test';
import { waitForMoveRoundTrip } from './helpers';

test.describe('PWA offline support (IMPLEMENTATION_PLAN.md P8.6)', () => {
  test('the app shell installs a service worker and is fully playable offline after a first online visit', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play vs Nova' })).toBeVisible();

    // Let the service worker finish installing and take control before going offline.
    await page.waitForFunction(
      () => navigator.serviceWorker !== undefined && navigator.serviceWorker.controller !== null,
      undefined,
      { timeout: 15_000 },
    );

    await context.setOffline(true);
    await page.reload();

    // The shell (menu screen) must render from cache with zero network access.
    await expect(page.getByRole('button', { name: 'Play vs Nova' })).toBeVisible();

    // The app must be genuinely playable offline, not just visible: start a game and
    // confirm a full human move + AI worker response round-trips with no network.
    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    const peg = page.locator('[data-testid^="peg-p0-"]').first();
    await peg.click();
    await page.locator('circle[stroke="#50c88c"]').first().click();
    await waitForMoveRoundTrip(page);

    await context.setOffline(false);
  });
});

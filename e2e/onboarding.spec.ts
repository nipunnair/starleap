import { test, expect } from '@playwright/test';

test.describe('First-launch Tutorial promotion (IMPLEMENTATION_PLAN.md P11.5)', () => {
  test('shows the onboarding callout before anything has been seen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('onboarding-callout')).toBeVisible();
  });

  test('starting a game marks onboarding seen and hides the callout', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('onboarding-callout')).toBeVisible();

    await page.getByRole('button', { name: 'Play vs Nova' }).click();
    await expect(page.getByTestId('game-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Quit' }).click();

    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await expect(page.getByTestId('onboarding-callout')).toHaveCount(0);
  });

  test('finishing the tutorial marks onboarding seen and hides the callout', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('onboarding-callout')).toBeVisible();

    await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    await expect(page.getByTestId('menu-screen')).toBeVisible();
    await expect(page.getByTestId('onboarding-callout')).toHaveCount(0);
  });

  test('the callout links straight into the tutorial', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('onboarding-callout').getByRole('button', { name: 'Start with the Tutorial' }).click();
    await expect(page.getByTestId('tutorial-screen')).toBeVisible();
  });
});

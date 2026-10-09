import { expect, test } from '@playwright/test';

test('la app carga sin errores de consola', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page.locator('app-root')).toBeAttached();
  expect(errors).toEqual([]);
});

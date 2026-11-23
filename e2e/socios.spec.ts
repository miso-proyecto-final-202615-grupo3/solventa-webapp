import { expect, test } from '@playwright/test';

const BASE = '/api/v1/bff-web/socios';

test('administrador registra un socio y ve confirmación activa', async ({ page }) => {
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ 'cognito:groups': ['SociosAdmin'] }));
    sessionStorage.setItem(
      'solventa.auth',
      JSON.stringify({ token: `header.${payload}.signature`, email: 'admin@solventa.test' }),
    );
  });
  await page.route(`**${BASE}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    await route.fulfill({
      status: 201,
      json: {
        id: 'socio-1',
        nombre: 'Banco Andino',
        correo: 'socio@yopmail.com',
        tipo_socio: 'Banco',
        canal_integracion: 'API',
        estado: 'ACTIVO',
        creado_en: '2026-11-16T15:00:00Z',
      },
    });
  });

  await page.goto('/operador/socios/nuevo');
  await page.getByLabel('Correo del socio').fill('socio@yopmail.com');
  await page.getByLabel('Nombre del socio').fill('Banco Andino');
  await page.getByLabel('Tipo de socio').fill('Banco');
  await page.getByLabel('Canal de integración').fill('API');
  await page.getByRole('button', { name: 'Registrar socio' }).click();

  await expect(page.getByRole('status')).toContainText('ACTIVO');
  await expect(page.getByRole('status')).toContainText('Banco Andino');
});

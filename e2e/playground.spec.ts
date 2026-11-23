import { expect, test } from '@playwright/test';

test.describe('Playground de APIs', () => {
  test('se accede sin autenticarse desde el login y ejecuta una API', async ({ page }) => {
    await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'x-prueba': 'si' },
        json: { access_token: 'tok', token_type: 'Bearer' },
      }),
    );

    await page.goto('/login');
    await page.getByRole('link', { name: 'Probar las APIs en el playground' }).click();

    await expect(page).toHaveURL(/\/playground$/);
    await expect(page.getByText('Fase 1 - Socio', { exact: true })).toBeVisible();
    await expect(page.getByText('Fase 10 - Certificado', { exact: true })).toBeAttached();
    await expect(page.getByText('Consultar salud')).toHaveCount(0);
    await expect(page.getByLabel('URL base BFF Socios')).toHaveCount(0);
    await expect(page.getByLabel('URL base BFF Web (precondición)')).toHaveCount(0);
    await expect(page.getByText(/Paso 1 de 24/)).toBeVisible();
    await expect(page.getByLabel('URL de la API')).toContainText(
      '/api/v1/bff-web/clientes/autenticar',
    );
    await expect(page.getByLabel('Headers (JSON)')).toHaveValue(/X-Correlation-Id/);
    await expect(page.getByLabel(/Payload \(JSON\)/)).toHaveValue(/"correo"/);

    await page.getByRole('button', { name: 'Ejecutar' }).click();
    await expect(page.getByText('HTTP 200')).toBeVisible();
    await expect(page.getByLabel('Headers de respuesta')).toContainText('x-prueba');
    await expect(page.getByLabel('Payload de respuesta')).toContainText('"access_token"');

    await page.getByRole('button', { name: /Consultar perfil/ }).click();
    await expect(page.getByLabel('URL de la API')).toContainText('/clientes/{{cliente_id}}/perfil');
    await page.getByRole('button', { name: /Descargar certificado/ }).click();
    await expect(page.getByText(/Paso 24 de 24/)).toBeVisible();
  });
});

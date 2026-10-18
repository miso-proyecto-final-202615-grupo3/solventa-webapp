import { expect, test } from '@playwright/test';

const URL_API = '**/api/v1/bff-web/consentimientos**';

const RESPUESTA = {
  cliente: {
    id: 'c1',
    nombres: 'Ana',
    apellidos: 'Pérez',
    tipo_documento: 'CC',
    numero_identificacion: '1020304050',
    correo: 'ana@example.com',
    estado_consentimiento: 'ACEPTADO',
  },
  eventos: [
    {
      id: 'e2',
      tipo_accion: 'REVOCACION',
      fecha: '2026-10-14T15:00:00Z',
      version_terminos: '1.0',
      canal: 'web',
    },
    {
      id: 'e1',
      tipo_accion: 'ACEPTACION',
      fecha: '2026-10-13T22:49:29Z',
      version_terminos: '1.0',
      canal: 'web',
    },
  ],
};

test.describe('Auditoría de consentimientos (HU1.1.3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operador/auditoria-consentimiento');
  });

  test('busca por número de identidad y lista el log más reciente primero', async ({ page }) => {
    let consulta: URL | undefined;
    await page.route(URL_API, (route) => {
      consulta = new URL(route.request().url());
      return route.fulfill({ status: 200, json: RESPUESTA });
    });

    await page.getByLabel('Valor').fill('1020304050');
    await page.getByRole('button', { name: 'Buscar' }).click();

    const filas = page.locator('tbody tr');
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0)).toContainText('Revocación');
    await expect(filas.nth(1)).toContainText('Aceptación');
    await expect(filas.nth(0)).toContainText('1.0');
    await expect(filas.nth(0)).toContainText('web');
    expect(consulta?.searchParams.get('identificacion')).toBe('1020304050');
  });

  test('busca por correo', async ({ page }) => {
    let consulta: URL | undefined;
    await page.route(URL_API, (route) => {
      consulta = new URL(route.request().url());
      return route.fulfill({ status: 200, json: RESPUESTA });
    });

    await page.getByLabel('Buscar por').selectOption('correo');
    await page.getByLabel('Valor').fill('ana@example.com');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.locator('tbody tr')).toHaveCount(2);
    expect(consulta?.searchParams.get('correo')).toBe('ana@example.com');
  });

  test('informa cuando no existe el cliente', async ({ page }) => {
    await page.route(URL_API, (route) =>
      route.fulfill({ status: 404, json: { detail: 'No hay un cliente con ese dato.' } }),
    );

    await page.getByLabel('Valor').fill('999999');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByRole('alert')).toContainText('No encontramos');
  });
});

import { expect, test } from '@playwright/test';

const CLIENTE_ID = 'b7d771b4-1ccd-4dcd-943c-cbce8e739256';

test.describe('Registro con consentimiento de datos (HU1.1.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombres').fill('Ana');
    await page.getByLabel('Apellidos').fill('Pérez');
    await page.getByLabel('Número de identificación').fill('1020304050');
    await page.getByLabel('Correo').fill('ana.perez@example.com');
    await page.getByLabel('Fecha de nacimiento').fill('1990-05-15');
    await page.getByLabel('País de residencia').fill('Colombia');
    await page.getByLabel('Teléfono de contacto').fill('3001234567');
  });

  test('valida cédula, correo, país y teléfono antes de permitir continuar', async ({ page }) => {
    const continuar = page.getByRole('button', { name: 'Continuar' });
    await page.getByRole('checkbox').check();
    await expect(continuar).toBeEnabled();

    const cedula = page.getByLabel('Número de identificación');
    await cedula.fill('12a-3');
    await expect(cedula).toHaveValue('123');
    await expect(page.getByText('entre 5 y 10 dígitos.')).toBeVisible();
    await expect(continuar).toBeDisabled();
    await cedula.fill('1020304050');

    const telefono = page.getByLabel('Teléfono de contacto');
    await telefono.fill('+57 300-abc');
    await expect(telefono).toHaveValue('57300');
    await expect(continuar).toBeDisabled();
    await telefono.fill('3001234567');

    await page.getByLabel('Correo').fill('ana@dominio');
    await expect(page.getByText('Ingresa un correo válido')).toBeVisible();
    await expect(continuar).toBeDisabled();
    await page.getByLabel('Correo').fill('ana.perez@example.com');

    const nacimiento = page.getByLabel('Fecha de nacimiento');
    await nacimiento.fill(`${new Date().getFullYear() - 10}-01-01`);
    await expect(page.getByText('Debes ser mayor de 18 años')).toBeVisible();
    await expect(continuar).toBeDisabled();
    await nacimiento.fill('1990-05-15');

    await page.getByLabel('País de residencia').fill('Narnia');
    await expect(page.getByText('Selecciona un país de la lista.')).toBeVisible();
    await expect(continuar).toBeDisabled();
    await page.getByLabel('País de residencia').fill('Colombia');
    await expect(continuar).toBeEnabled();
  });

  test('ofrece Colombia de primero en la lista de países', async ({ page }) => {
    const opciones = await page
      .locator('#registro-paises option')
      .evaluateAll((nodos) => nodos.map((nodo) => (nodo as HTMLOptionElement).value));
    expect(opciones[0]).toBe('Colombia');
    expect(opciones.slice(1)).toEqual(
      [...opciones.slice(1)].sort((a, b) => a.localeCompare(b, 'es')),
    );
  });

  test('el checkbox inicia desmarcado y bloquea el avance hasta aceptar', async ({ page }) => {
    const checkbox = page.getByRole('checkbox');
    const continuar = page.getByRole('button', { name: 'Continuar' });

    await expect(checkbox).not.toBeChecked();
    await expect(continuar).toBeDisabled();

    await checkbox.check();
    await expect(continuar).toBeEnabled();
  });

  test('el enlace abre el texto legal completo en una pestaña nueva', async ({ page }) => {
    const [terminos] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: /términos de consentimiento/ }).click(),
    ]);

    await expect(terminos).toHaveURL(/\/terminos$/);
    await expect(
      terminos.getByRole('heading', { name: 'Consentimiento de uso de datos' }),
    ).toBeVisible();
    await expect(terminos.getByText('Open Finance').first()).toBeVisible();
  });

  test('registra al cliente enviando el consentimiento explícito en el mismo registro', async ({
    page,
  }) => {
    const solicitudes: string[] = [];
    let cuerpoRegistro: Record<string, unknown> | undefined;

    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.url().includes('/api/')) {
        solicitudes.push(new URL(request.url()).pathname);
      }
    });
    await page.route('**/api/v1/bff-web/clientes/registro', (route) => {
      cuerpoRegistro = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: CLIENTE_ID } });
    });

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByText('Paso 2 de 2')).toBeVisible();
    await page.getByLabel('Contraseña', { exact: true }).fill('Secreta123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(solicitudes).toEqual(['/api/v1/bff-web/clientes/registro']);
    expect(cuerpoRegistro?.['consentimiento_datos']).toBe(true);
  });

  test('si el registro falla informa el error y permite reintentar', async ({ page }) => {
    await page.route('**/api/v1/bff-web/clientes/registro', (route) =>
      route.fulfill({ status: 503, json: { detail: 'No disponible' } }),
    );

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Contraseña', { exact: true }).fill('Secreta123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('alert')).toContainText('temporalmente no disponible');
    await expect(page.getByText('Paso 2 de 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });
});

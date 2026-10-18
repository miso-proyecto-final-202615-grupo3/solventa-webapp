import { expect, test } from '@playwright/test';

const CLIENTE_ID = 'b7d771b4-1ccd-4dcd-943c-cbce8e739256';

function auditoria(estado: 'ACEPTADO' | 'REVOCADO') {
  return {
    cliente: {
      id: CLIENTE_ID,
      nombres: 'Ana',
      apellidos: 'Pérez',
      tipo_documento: 'CC',
      numero_identificacion: '1020304050',
      correo: 'cliente@correo.com',
      estado_consentimiento: estado,
    },
    eventos: [],
  };
}

test.describe('Perfil del cliente', () => {
  test('inicia sesión, revoca el consentimiento y ve el nuevo estado', async ({ page }) => {
    let estado: 'ACEPTADO' | 'REVOCADO' = 'ACEPTADO';
    await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
      route.fulfill({
        status: 200,
        json: { access_token: 'tok', id_token: 'id', token_type: 'Bearer' },
      }),
    );
    await page.route('**/api/v1/bff-web/consentimientos?**', (route) =>
      route.fulfill({ status: 200, json: auditoria(estado) }),
    );
    await page.route(`**/api/v1/bff-web/clientes/${CLIENTE_ID}/consentimiento`, (route) => {
      estado = route.request().postDataJSON().estado;
      return route.fulfill({
        status: 200,
        json: { cliente_id: CLIENTE_ID, estado, otorgado_en: null, revocado_en: 'x' },
      });
    });

    await page.goto('/login');
    await page.getByLabel('Correo').fill('cliente@correo.com');
    await page.getByLabel('Contraseña').fill('secreto');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Perfil' }).click();
    await expect(page).toHaveURL(/\/cliente\/perfil$/);
    await expect(
      page.getByRole('heading', { name: 'Tratamiento de datos personales' }),
    ).toBeVisible();

    await expect(page.getByTestId('estado')).toHaveText('ACEPTADO');
    await page.getByRole('button', { name: 'Revocar consentimiento' }).click();
    await page.getByRole('button', { name: 'Sí, revocar' }).click();

    await expect(page.getByTestId('estado')).toHaveText('REVOCADO');
    await expect(page.getByRole('button', { name: 'Aceptar consentimiento' })).toBeVisible();
  });

  test('sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/cliente/perfil');
    await expect(page).toHaveURL(/\/login$/);
  });
});

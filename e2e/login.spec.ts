import { expect, test } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('redirige la raíz a /login y muestra el formulario', async ({ page }) => {
    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle('Entra a tu cuenta · Solventa');
    await expect(page.getByRole('heading', { name: 'Entra a tu cuenta' })).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  test('una ruta desconocida vuelve a /login', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('enviar vacío muestra errores de validación accesibles', async ({ page }) => {
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Escribe el correo de tu cuenta.')).toBeVisible();
    await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
    await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('un correo con formato inválido muestra su mensaje', async ({ page }) => {
    await page.getByLabel('Correo').fill('no-es-un-correo');
    await page.getByLabel('Contraseña').fill('secreto');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Revisa el formato del correo')).toBeVisible();
  });

  test('ver/ocultar contraseña alterna el tipo del campo', async ({ page }) => {
    const password = page.getByLabel('Contraseña');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Ver contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('credenciales válidas llevan a /cliente/polizas', async ({ page }) => {
    await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
      route.fulfill({
        status: 200,
        json: { access_token: 'tok', id_token: 'id', token_type: 'Bearer' },
      }),
    );
    await page.getByLabel('Correo').fill('cliente@correo.com');
    await page.getByLabel('Contraseña').fill('secreto');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/cliente\/polizas$/);
    await expect(
      page.getByRole('heading', { name: 'Aún no tienes pólizas activas' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Registrarme' })).toHaveCount(0);
  });

  test('credenciales incorrectas muestran error y se queda en /login', async ({ page }) => {
    await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
      route.fulfill({ status: 401, json: { detail: 'Credenciales inválidas.' } }),
    );
    await page.getByLabel('Correo').fill('cliente@correo.com');
    await page.getByLabel('Contraseña').fill('mala');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/cliente/polizas sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/cliente/polizas');
    await expect(page).toHaveURL(/\/login$/);
  });
});

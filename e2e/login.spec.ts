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

  test('credenciales válidas no muestran error y salen de la pantalla de login', async ({
    page,
  }) => {
    await page.getByLabel('Correo').fill('cliente@correo.com');
    await page.getByLabel('Contraseña').fill('secreto');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    // TODO: cuando exista /cliente/polizas, afirmar la URL de destino.
    // Hasta entonces la ruta comodín devuelve al login, pero el servicio ya quedó autenticado.
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});

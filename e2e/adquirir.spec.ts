import { expect, test } from '@playwright/test';

const productos = [
  {
    producto_id: 'p-1',
    codigo: 'VIAJE',
    nombre: 'Seguro de viaje',
    ramo: 'Viajes',
    pais: 'CO',
    moneda: 'COP',
    coberturas: [],
  },
  {
    producto_id: 'p-2',
    codigo: 'HOGAR',
    nombre: 'Seguro de hogar con protección integral',
    ramo: 'Hogar',
    pais: 'CO',
    moneda: 'COP',
    coberturas: [
      { cobertura_id: 'c-1', nombre: 'Incendio y eventos naturales' },
      { cobertura_id: 'c-2', nombre: 'Asistencia y reparaciones del hogar' },
      { cobertura_id: 'c-3', nombre: 'Protección de bienes personales' },
    ],
  },
];

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 320, height: 800 },
]) {
  test(`las tarjetas mantienen el botón dentro y al fondo (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
      route.fulfill({
        status: 200,
        json: { access_token: 'tok', id_token: 'id', token_type: 'Bearer' },
      }),
    );
    await page.route('**/api/v1/bff-web/productos', (route) =>
      route.fulfill({ status: 200, json: productos }),
    );

    await page.goto('/login');
    await page.getByLabel('Correo').fill('cliente@correo.com');
    await page.getByLabel('Contraseña').fill('secreto');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Adquirir' }).click();

    const tarjetas = page.getByTestId('producto');
    await expect(tarjetas).toHaveCount(2);
    const botones = await tarjetas.evaluateAll((elements) =>
      elements.map((card) => {
        const button = card.querySelector('a')!;
        const meta = card.querySelector('.adq__meta')!;
        const cardRect = card.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const metaRect = meta.getBoundingClientRect();
        const style = getComputedStyle(card);
        return {
          left: buttonRect.left - cardRect.left,
          right: cardRect.right - buttonRect.right,
          bottom: cardRect.bottom - buttonRect.bottom,
          paddingBottom: parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth),
          gap: buttonRect.top - metaRect.bottom,
          buttonBottom: buttonRect.bottom,
          cardTop: cardRect.top,
        };
      }),
    );

    for (const boton of botones) {
      expect(boton.left).toBeGreaterThanOrEqual(0);
      expect(boton.right).toBeGreaterThanOrEqual(0);
      expect(boton.bottom).toBeCloseTo(boton.paddingBottom, 1);
      expect(boton.gap).toBeGreaterThanOrEqual(0);
    }
    if (viewport.width === 1280) {
      expect(botones[0].cardTop).toBeCloseTo(botones[1].cardTop, 1);
      expect(botones[0].buttonBottom).toBeCloseTo(botones[1].buttonBottom, 1);
    }
    await expect(tarjetas.nth(0).getByRole('link', { name: 'Cotizar' })).toHaveAttribute(
      'href',
      '/cliente/adquirir/VIAJE/cotizar',
    );
  });
}

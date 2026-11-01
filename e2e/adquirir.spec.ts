import { expect, test } from '@playwright/test';

const productos = [
  {
    producto_id: 'p-1',
    codigo: 'VIAJE',
    nombre: 'Seguro de viaje',
    ramo: 'Viajes',
    pais: 'CO',
    moneda: 'COP',
    mensaje_legal: 'Condiciones del seguro de viaje.',
    fuentes_datos: ['RUNT', 'Simit'],
    coberturas: [],
  },
  {
    producto_id: 'p-2',
    codigo: 'HOGAR',
    nombre: 'Seguro de hogar con protección integral',
    ramo: 'Hogar',
    pais: 'CO',
    moneda: 'COP',
    mensaje_legal: 'Condiciones del seguro de hogar.',
    fuentes_datos: ['Catastro'],
    coberturas: [
      { cobertura_id: 'c-1', nombre: 'Incendio y eventos naturales' },
      { cobertura_id: 'c-2', nombre: 'Asistencia y reparaciones del hogar' },
      { cobertura_id: 'c-3', nombre: 'Protección de bienes personales' },
    ],
  },
  {
    producto_id: 'p-3',
    codigo: 'VIDA',
    nombre: 'Seguro de vida',
    ramo: 'Vida',
    pais: 'CO',
    moneda: 'COP',
    mensaje_legal: '',
    fuentes_datos: [],
    coberturas: [],
  },
];

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 320, height: 800 },
]) {
  test(`las tarjetas mantienen las fuentes y el botón al fondo (${viewport.width}px)`, async ({
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
    await expect(tarjetas).toHaveCount(3);
    const botones = await tarjetas.evaluateAll((elements) =>
      elements.map((card) => {
        const button = card.querySelector('a')!;
        const meta = card.querySelector('.adq__meta')!;
        const cardRect = card.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const metaRect = meta.getBoundingClientRect();
        const style = getComputedStyle(card);
        const footer = card.querySelector('.adq__card-footer')!;
        const fuentes = footer.querySelector('.adq__fuentes');
        const fuentesRect = fuentes?.getBoundingClientRect();
        return {
          left: buttonRect.left - cardRect.left,
          right: cardRect.right - buttonRect.right,
          bottom: cardRect.bottom - buttonRect.bottom,
          paddingBottom: parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth),
          gap: buttonRect.top - metaRect.bottom,
          buttonBottom: buttonRect.bottom,
          cardTop: cardRect.top,
          fuentesGap: fuentesRect ? buttonRect.top - fuentesRect.bottom : null,
          footerGap: parseFloat(getComputedStyle(footer).rowGap),
          fuentesTop: fuentesRect?.top ?? null,
          metaBottom: metaRect.bottom,
        };
      }),
    );

    for (const boton of botones) {
      expect(boton.left).toBeGreaterThanOrEqual(0);
      expect(boton.right).toBeGreaterThanOrEqual(0);
      expect(boton.bottom).toBeCloseTo(boton.paddingBottom, 1);
      expect(boton.gap).toBeGreaterThanOrEqual(0);
      if (boton.fuentesGap !== null && boton.fuentesTop !== null) {
        expect(boton.fuentesGap).toBeCloseTo(boton.footerGap, 1);
        expect(boton.fuentesTop).toBeGreaterThanOrEqual(boton.metaBottom);
      }
    }
    expect(botones[2].fuentesGap).toBeNull();
    if (viewport.width === 1280) {
      expect(botones[0].cardTop).toBeCloseTo(botones[1].cardTop, 1);
      expect(botones[0].buttonBottom).toBeCloseTo(botones[1].buttonBottom, 1);
    }
    await expect(tarjetas.nth(0).getByRole('link', { name: 'Cotizar' })).toHaveAttribute(
      'href',
      '/cliente/adquirir/VIAJE/cotizar',
    );

    await expect(tarjetas.nth(0).locator('.adq__card-footer .adq__badge')).toHaveText([
      'RUNT',
      'Simit',
    ]);
    const infoViaje = tarjetas
      .nth(0)
      .getByRole('button', { name: 'Información de Seguro de viaje' });
    await infoViaje.click();
    const detalleViaje = page.getByRole('dialog', { name: 'Seguro de viaje' });
    await expect(detalleViaje).toBeVisible();
    await expect(detalleViaje).toContainText('Condiciones del seguro de viaje.');
    await expect(detalleViaje).toContainText('No disponibles.');
    await expect(detalleViaje.locator('.adq__badge')).toHaveText(['RUNT', 'Simit']);
    await page.keyboard.press('Escape');
    await expect(detalleViaje).not.toBeVisible();
    await expect(infoViaje).toBeFocused();

    await tarjetas
      .nth(1)
      .getByRole('button', { name: 'Información de Seguro de hogar con protección integral' })
      .click();
    const detalleHogar = page.getByRole('dialog', {
      name: 'Seguro de hogar con protección integral',
    });
    await expect(detalleHogar).toContainText('Condiciones del seguro de hogar.');
    await expect(detalleHogar.getByRole('listitem')).toHaveText([
      'Incendio y eventos naturales',
      'Asistencia y reparaciones del hogar',
      'Protección de bienes personales',
    ]);
    await expect(detalleHogar.locator('.adq__badge')).toHaveText(['Catastro']);
    await detalleHogar.getByRole('button', { name: 'Cerrar' }).click();
    await expect(detalleHogar).not.toBeVisible();
  });
}

test('formatea el monto mientras se edita y envía su valor numérico', async ({ page }) => {
  const producto = {
    ...productos[0],
    parametros: [
      {
        nombre: 'monto',
        etiqueta: 'Monto asegurado',
        tipo: 'number',
        unidad: 'COP',
        minimo: '1',
      },
      { nombre: 'dias', etiqueta: 'Días', tipo: 'integer', minimo: '1' },
    ],
  };
  await page.route('**/api/v1/bff-web/clientes/autenticar', (route) =>
    route.fulfill({
      status: 200,
      json: { access_token: 'tok', id_token: 'id', token_type: 'Bearer' },
    }),
  );
  await page.route('**/api/v1/bff-web/productos', (route) =>
    route.fulfill({ status: 200, json: [producto] }),
  );
  await page.route('**/api/v1/bff-web/consentimientos?*', (route) =>
    route.fulfill({ status: 200, json: { cliente: { id: 'cli-1' }, eventos: [] } }),
  );
  let solicitud: unknown;
  await page.route('**/api/v1/bff-web/cotizaciones', (route) => {
    solicitud = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      json: { cotizacion_id: 'q-1', producto_codigo: 'VIAJE' },
    });
  });

  await page.goto('/login');
  await page.getByLabel('Correo').fill('cliente@correo.com');
  await page.getByLabel('Contraseña').fill('secreto');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Adquirir' }).click();
  await page.getByRole('link', { name: 'Cotizar' }).click();
  const monto = page.getByLabel('Monto asegurado (COP)');
  await monto.pressSequentially('1234');
  await expect(monto).toHaveValue('1.234');
  await monto.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 2));
  await monto.press('Backspace');
  await expect(monto).toHaveValue('234');
  await monto.fill('');
  await monto.pressSequentially('12.34');
  await monto.blur();
  await expect(
    page.getByText('Ingresa un monto válido usando coma para los decimales.'),
  ).toBeVisible();
  await monto.fill('');
  await monto.pressSequentially('1234567,50');
  await expect(monto).toHaveValue('1.234.567,50');
  await monto.press('Home');
  await monto.press('ArrowRight');
  await monto.pressSequentially('9');
  await expect(monto).toHaveValue('19.234.567,50');
  await page.getByLabel('Días').fill('14');
  await page.getByRole('button', { name: 'Cotizar ahora' }).click();
  await expect
    .poll(() => solicitud)
    .toEqual({
      cliente_id: 'cli-1',
      producto_codigo: 'VIAJE',
      parametros: { monto: 19234567.5, dias: 14 },
    });
});

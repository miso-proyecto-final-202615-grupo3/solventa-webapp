import { expect, test } from '@playwright/test';

const producto = {
  producto_id: 'p-1',
  codigo: 'VIAJE',
  nombre: 'Seguro de viaje',
  ramo: 'Viajes',
  pais: 'CO',
  moneda: 'COP',
  mensaje_legal: '',
  fuentes_datos: [],
  coberturas: [],
  parametros: [{ nombre: 'dias', etiqueta: 'Días', tipo: 'integer', minimo: '1' }],
};

const cotizacion = {
  cotizacion_id: 'q-1',
  cliente_id: 'cli-1',
  producto_codigo: 'VIAJE',
  estado: 'VIGENTE',
  moneda: 'COP',
  prima_base: '50000.00',
  ajustes: [],
  impuestos: [],
  prima_total: '50000.00',
  degradada: false,
  motivos_degradacion: [],
  coberturas: [],
  expira_en: '2026-12-30T10:00:00Z',
  creada_en: '2026-10-25T10:00:00Z',
};

const condiciones = {
  condiciones_cotizacion_id: 'cc-1',
  cotizacion_id: 'q-1',
  version_condiciones_generales: 'v1',
  condiciones_generales:
    '1. OBJETO\n\nCubre gastos médicos en viaje.\n\n- Hospitalización\n- Repatriación',
  condiciones_particulares: {
    plazo_dias: 14,
    destino: 'Europa',
    vigencia_desde: '2026-01-01T10:00:00Z',
    vigencia_hasta: '2027-01-01T10:00:00Z',
    coberturas: [
      {
        nombre: 'Hospitalización',
        prima: '34000',
        limite_asegurado: '1000000',
        deducible: '10000',
      },
      { nombre: 'Equipaje', prima: '9000', deducible: '500' },
    ],
  },
  creada_en: '2026-10-25T10:00:00Z',
  ultima_decision: null,
};

const KYC = '**/api/v1/bff-web/clientes/cli-1';
const CONDICIONES = '**/api/v1/bff-web/cotizaciones/q-1/condiciones';

test.beforeEach(async ({ page }) => {
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
  await page.route('**/api/v1/bff-web/polizas/mis-polizas', (route) =>
    route.fulfill({ status: 200, json: [] }),
  );
  await page.route('**/api/v1/bff-web/cotizaciones', (route) =>
    route.fulfill({ status: 200, json: cotizacion }),
  );
  await page.route(CONDICIONES, (route) => route.fulfill({ status: 200, json: condiciones }));

  await page.goto('/login');
  await page.getByLabel('Correo').fill('cliente@correo.com');
  await page.getByLabel('Contraseña').fill('secreto');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Adquirir', exact: true }).click();
  await page.getByRole('link', { name: 'Cotizar' }).click();
  await page.getByLabel('Días').fill('14');
  await page.getByRole('button', { name: 'Cotizar ahora' }).click();
  await page.getByRole('link', { name: 'Siguiente paso' }).click();
});

test('acepta las condiciones y, con KYC validado, solo confirma la verificación previa', async ({
  page,
}) => {
  let decision: unknown;
  await page.route(`${CONDICIONES}/decisiones`, (route) => {
    decision = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: {} });
  });
  await page.route(`${KYC}/perfil`, (route) =>
    route.fulfill({ status: 200, json: { id: 'cli-1', estado_kyc: 'VALIDADO' } }),
  );

  await expect(page.getByRole('heading', { name: 'Condiciones de la póliza' })).toBeVisible();
  await expect(page.getByTestId('condiciones-generales')).toContainText('Cubre gastos médicos');
  const filas = page.getByTestId('condiciones-particulares').locator(':scope > div');
  await expect(filas).toHaveCount(5);
  await expect(filas.nth(2)).toContainText('Vigencia');
  await expect(filas.nth(2)).toContainText('01/01/2026 – 01/01/2027');
  await expect(filas.nth(3)).toContainText('Hospitalización');
  const campos = filas.nth(3).locator('dd .adq__campo');
  await expect(campos).toHaveCount(3);
  await expect(campos.nth(0)).toContainText('Prima:');
  await expect(campos.nth(1)).toContainText('Límite asegurado:');
  await expect(campos.nth(2)).toContainText('Deducible:');
  await expect(filas.nth(3).locator('dd')).not.toContainText('Nombre:');
  await expect(filas.nth(4)).toContainText('Equipaje');
  const siguiente = page.getByRole('button', { name: 'Siguiente paso' });
  await expect(siguiente).toBeDisabled();
  await page.getByLabel(/He leído y acepto/).check();
  await expect(siguiente).toBeEnabled();
  await siguiente.click();

  await expect
    .poll(() => decision)
    .toEqual({
      condiciones_cotizacion_id: 'cc-1',
      decision: 'ACEPTADA',
    });
  await expect(page.getByTestId('ya-verificado')).toContainText('ya fue verificada');
  await expect(page.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled();
});

test('sin KYC sube el documento, verifica y muestra la aprobación', async ({ page }) => {
  await page.route(`${CONDICIONES}/decisiones`, (route) =>
    route.fulfill({ status: 201, json: {} }),
  );
  await page.route(`${KYC}/perfil`, (route) =>
    route.fulfill({ status: 200, json: { id: 'cli-1', estado_kyc: 'PENDIENTE' } }),
  );
  await page.route(`${KYC}/verificaciones-kyc-aml`, (route) =>
    route.fulfill({
      status: 202,
      json: { verificacion_id: 'v-1', estado: 'INICIADA', fecha: '2026-10-25T10:00:00Z' },
    }),
  );
  let consultas = 0;
  await page.route(`${KYC}/verificaciones-kyc-aml/v-1`, (route) => {
    consultas++;
    const estado = consultas < 2 ? 'PENDIENTE' : 'APROBADO';
    return route.fulfill({
      status: 200,
      json: {
        verificacion_id: 'v-1',
        cliente_id: 'cli-1',
        resultado_kyc: estado,
        resultado_aml: estado,
        estado,
      },
    });
  });

  await page.getByLabel(/He leído y acepto/).check();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  const iniciar = page.getByRole('button', { name: 'Iniciar verificación KYC y AML' });
  await expect(iniciar).toBeDisabled();
  const imagen = { name: 'doc.png', mimeType: 'image/png', buffer: Buffer.from('png') };
  await page.getByLabel(/frontal/).setInputFiles(imagen);
  await page.getByLabel(/reverso/).setInputFiles(imagen);
  await expect(iniciar).toBeEnabled();
  await iniciar.click();

  await expect(page.getByTestId('resultado-aprobado')).toBeVisible({ timeout: 10_000 });
  await page.route('**/api/v1/bff-web/cotizaciones/q-1/firma-digital', (route) =>
    route.fulfill({ status: 404, json: { detail: 'Sin firma' } }),
  );
  await page.getByRole('button', { name: 'Siguiente paso' }).click();
  await expect(page.getByRole('heading', { name: 'Firma digital' })).toBeVisible();
});

for (const width of [320, 1280]) {
  test(`firma, paga y descarga el certificado (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(`${CONDICIONES}/decisiones`, (route) =>
      route.fulfill({ status: 201, json: {} }),
    );
    await page.route(`${KYC}/perfil`, (route) =>
      route.fulfill({ status: 200, json: { id: 'cli-1', estado_kyc: 'VALIDADO' } }),
    );
    let firmaCapturada = false;
    await page.route('**/api/v1/bff-web/cotizaciones/q-1/firma-digital', (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataBuffer()!;
        expect(body.includes(Buffer.from('name="cliente_id"'))).toBe(true);
        expect(body.includes(Buffer.from('name="producto_id"'))).toBe(true);
        expect(body.includes(Buffer.from('image/png'))).toBe(true);
        expect(body.includes(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
        firmaCapturada = true;
      }
      return firmaCapturada
        ? route.fulfill({ status: 200, json: { estado: 'CAPTURADA' } })
        : route.fulfill({ status: 404, json: { detail: 'Sin firma' } });
    });
    await page.route('**/api/v1/bff-web/cotizaciones/q-1/resumen-pago', (route) =>
      route.fulfill({
        status: 200,
        json: {
          cotizacion_id: 'q-1',
          prima_total: '50000',
          moneda: 'COP',
          expira_en: '2027-01-01T00:00:00Z',
          metodos_pago: [
            { codigo: 'PAYPAL', por_defecto: true },
            { codigo: 'TARJETA_CREDITO', por_defecto: false },
          ],
        },
      }),
    );
    let solicitudPago: unknown;
    await page.route('**/api/v1/bff-web/pagos', (route) => {
      solicitudPago = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: {
          pago_id: 'pago-1',
          cotizacion_id: 'q-1',
          cliente_id: 'cli-1',
          estado: 'PENDIENTE',
          codigo_rechazo: null,
        },
      });
    });
    await page.route('**/api/v1/bff-web/pagos/pago-1', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        json: {
          pago_id: 'pago-1',
          cotizacion_id: 'q-1',
          cliente_id: 'cli-1',
          estado: 'APROBADO',
          codigo_rechazo: null,
        },
      });
    });
    await page.route('**/api/v1/bff-web/cotizaciones/q-1/poliza', (route) =>
      route.fulfill({
        status: 200,
        json: {
          poliza_id: 'pol-1',
          numero: '001',
          estado: 'EMITIDA',
          cotizacion_id: 'q-1',
          titular_nombre: 'Cliente de prueba',
          vigencia_desde: '2026-01-01T00:00:00Z',
          vigencia_hasta: '2027-01-01T00:00:00Z',
          prima: '50000',
          moneda: 'COP',
          estado_certificado: 'GENERADO',
        },
      }),
    );
    await page.route('**/api/v1/bff-web/polizas/pol-1/certificado', (route) =>
      route.fulfill({
        status: 200,
        json: {
          poliza_id: 'pol-1',
          estado_certificado: 'GENERADO',
          disponible: true,
          ultima_generacion: { estado: 'GENERADO', error_codigo: null },
        },
      }),
    );
    await page.route('**/api/v1/bff-web/polizas/pol-1/certificado/descarga', (route) =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }),
    );

    const estiloDetalles = (selector: string) =>
      page.locator(selector).evaluate((elemento) => {
        const fila = elemento.querySelector('div')!;
        const valor = elemento.querySelector('dd')!;
        return {
          lista: getComputedStyle(elemento).display,
          fila: getComputedStyle(fila).display,
          borde: getComputedStyle(fila).borderBottomStyle,
          alineacion: getComputedStyle(valor).textAlign,
        };
      });
    const estiloCondiciones = await estiloDetalles('[data-testid="condiciones-particulares"]');
    const vigencia = page.getByTestId('condiciones-particulares').locator('.adq__vigencia');
    await expect(vigencia).toHaveText('01/01/2026 – 01/01/2027');
    await expect(vigencia).toHaveCSS('white-space', 'nowrap');
    const medidaVigencia = await vigencia.evaluate((elemento) => ({
      contenido: elemento.scrollWidth,
      ancho: elemento.clientWidth,
      fila: elemento.parentElement?.clientWidth,
      etiqueta: elemento.previousElementSibling?.clientWidth,
    }));
    expect(medidaVigencia.contenido, JSON.stringify(medidaVigencia)).toBeLessThanOrEqual(
      medidaVigencia.ancho,
    );
    const camposCobertura = page
      .getByTestId('condiciones-particulares')
      .locator('div')
      .filter({ hasText: 'Hospitalización' })
      .locator('.adq__campo');
    const posiciones = await camposCobertura.evaluateAll((elementos) =>
      elementos.map((elemento) => elemento.getBoundingClientRect().top),
    );
    expect(posiciones).toHaveLength(3);
    expect(posiciones[0]).toBeLessThan(posiciones[1]);
    expect(posiciones[1]).toBeLessThan(posiciones[2]);
    await page.getByLabel(/He leído y acepto/).check();
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Identidad' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await expect(page.getByRole('heading', { name: 'Firma digital' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar firma' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reintentar carga' })).toHaveCount(0);
    await expect(page.getByRole('listitem').filter({ hasText: 'Firma' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByRole('button', { name: 'Siguiente paso' })).toBeDisabled();
    const area = page.locator('canvas');
    const rect = (await area.boundingBox())!;
    await page.mouse.move(rect.x + 30, rect.y + 30);
    await page.mouse.down();
    await page.mouse.move(rect.x + 120, rect.y + 65, { steps: 8 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Enviar firma' }).click();
    await expect(page.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled();
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await expect(page.getByRole('heading', { name: 'Paga y emitimos tu póliza' })).toBeVisible();
    await expect(page.getByLabel('Total a pagar hoy')).toHaveAttribute('readonly');
    await expect(page.getByLabel('Correo de PayPal')).toHaveValue('cliente@correo.com');
    await page.getByRole('radio', { name: 'Tarjeta de crédito' }).check();
    const numero = page.getByLabel('Número de tarjeta');
    const vence = page.getByLabel('Vence');
    const cvv = page.getByLabel('CVV');
    const cajas = await Promise.all([numero.boundingBox(), vence.boundingBox(), cvv.boundingBox()]);
    expect(cajas[0]!.y).toBe(cajas[1]!.y);
    expect(cajas[1]!.y).toBe(cajas[2]!.y);
    expect(cajas[0]!.x).toBeLessThan(cajas[1]!.x);
    expect(cajas[1]!.x).toBeLessThan(cajas[2]!.x);
    await numero.pressSequentially('411111111111111112345');
    await expect(numero).toHaveValue('4111 1111 1111 1111 123');
    await vence.pressSequentially('1299');
    await expect(vence).toHaveValue('12/99');
    await cvv.pressSequentially('1234');
    await expect(cvv).toHaveAttribute('type', 'password');
    await expect(cvv).toHaveValue('123');
    if (width !== 320) {
      await page.getByRole('radio', { name: 'PayPal' }).check();
      await expect(page.getByLabel('Correo de PayPal')).toHaveValue('cliente@correo.com');
      await page.getByLabel('Correo de PayPal').fill('cliente@example.com');
    }
    await page.getByRole('button', { name: 'Pagar', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Pago en curso' })).toBeVisible();
    await expect(page.getByText('Pago aprobado.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pagar', exact: true })).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByLabel('Total a pagar hoy')).toHaveCount(0);
    if (width === 320) {
      expect(solicitudPago).toEqual({
        cotizacion_id: 'q-1',
        cliente_id: 'cli-1',
        metodo_pago: 'TARJETA_CREDITO',
        numero_tarjeta: '4111111111111111123',
        mes_expiracion: 12,
        anio_expiracion: 2099,
        cvv: '123',
      });
    } else {
      expect(solicitudPago).toEqual({
        cotizacion_id: 'q-1',
        cliente_id: 'cli-1',
        metodo_pago: 'PAYPAL',
        paypal_email: 'cliente@example.com',
      });
    }
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await expect(page.getByText('Cliente de prueba')).toBeVisible();
    await expect(page.locator('.confirmacion__detalles')).toContainText('001');
    await expect(page.locator('.confirmacion__detalles')).not.toContainText('pol-1');
    await expect(page.locator('.confirmacion__detalles')).toContainText('01/01/2026 – 01/01/2027');
    expect(await estiloDetalles('.confirmacion__detalles')).toEqual(estiloCondiciones);
    await expect(page.getByRole('listitem').filter({ hasText: 'Emitida' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar certificado PDF' }).click();
    expect((await descarga).suggestedFilename()).toBe('certificado-pol-1.pdf');
    await expect(page.getByRole('link', { name: 'Ver mis pólizas' })).toHaveAttribute(
      'href',
      '/cliente/polizas',
    );
  });
}

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
  condiciones_particulares: { plazo_dias: 14, destino: 'Europa' },
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
  await page.route('**/api/v1/bff-web/cotizaciones', (route) =>
    route.fulfill({ status: 200, json: cotizacion }),
  );
  await page.route(CONDICIONES, (route) =>
    route.fulfill({ status: 200, json: condiciones }),
  );

  await page.goto('/login');
  await page.getByLabel('Correo').fill('cliente@correo.com');
  await page.getByLabel('Contraseña').fill('secreto');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Adquirir' }).click();
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
  await page.getByRole('button', { name: 'Siguiente paso' }).click();
  await expect(page.getByRole('heading', { name: 'Pago' })).toBeVisible();
});

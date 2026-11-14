import { expect, test } from '@playwright/test';

const BASE = '/api/v1/bff-web/auditoria-emision';
const COTIZACION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CLIENTE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('el auditor consulta y reconstruye la línea de tiempo de emisión', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'solventa.auth',
      JSON.stringify({ token: 'token-auditor', email: 'auditor@solventa.test' }),
    );
  });
  await page.route(`**${BASE}*`, (route) =>
    route.fulfill({
      status: 200,
      json: {
        poliza_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        numero: 'POL-20261113-AB12CD34',
        cotizacion_id: COTIZACION_ID,
        cliente_id: CLIENTE_ID,
        eventos: [
          {
            evento_id: '00000000-0000-0000-0000-000000000001',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'CONDICIONES_ACEPTADAS',
            ocurrido_en: '2026-11-13T12:00:00Z',
            origen: 'cliente',
            actor_id: CLIENTE_ID,
            resultado: 'ACEPTADA',
            referencia_id: 'decision-1',
            correlation_id: 'corr-1',
            detalles: {},
          },
          {
            evento_id: '00000000-0000-0000-0000-000000000002',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'KYC_AML_RESULTADO',
            ocurrido_en: '2026-11-13T13:00:00Z',
            origen: 'mock_kyc',
            actor_id: null,
            resultado: 'APROBADA',
            referencia_id: 'verification-1',
            correlation_id: 'corr-1',
            detalles: { kyc: 'APROBADO', aml: 'APROBADO' },
          },
          {
            evento_id: '00000000-0000-0000-0000-000000000003',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'PAGO_RESULTADO',
            ocurrido_en: '2026-11-13T14:00:00Z',
            origen: 'mock_paymentprovider',
            actor_id: null,
            resultado: 'APROBADO',
            referencia_id: 'payment-1',
            correlation_id: 'corr-1',
            detalles: {},
          },
          {
            evento_id: '00000000-0000-0000-0000-000000000004',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'FIRMA_CAPTURADA',
            ocurrido_en: '2026-11-13T14:30:00Z',
            origen: 'cliente',
            actor_id: CLIENTE_ID,
            resultado: 'CAPTURADA',
            referencia_id: 'signature-1',
            correlation_id: 'corr-1',
            detalles: {},
          },
          {
            evento_id: '00000000-0000-0000-0000-000000000005',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'FIRMA_VINCULADA',
            ocurrido_en: '2026-11-13T14:45:00Z',
            origen: 'insurancepolicies_service',
            actor_id: null,
            resultado: 'VINCULADA',
            referencia_id: 'signature-1',
            correlation_id: 'corr-1',
            detalles: {},
          },
          {
            evento_id: '00000000-0000-0000-0000-000000000006',
            cotizacion_id: COTIZACION_ID,
            cliente_id: CLIENTE_ID,
            tipo: 'POLIZA_EMITIDA',
            ocurrido_en: '2026-11-13T15:00:00Z',
            origen: 'insurancepolicies_service',
            actor_id: null,
            resultado: 'EMITIDA',
            referencia_id: 'policy-1',
            correlation_id: 'corr-1',
            detalles: {},
          },
        ],
      },
    }),
  );
  await page.goto('/operador/auditoria-emision');
  await expect(page.getByRole('heading', { name: 'Trazabilidad de emisión' })).toBeVisible();
  await page.getByLabel('Número de póliza').fill('POL-20261113-AB12CD34');
  await page.getByRole('button', { name: 'Consultar trazabilidad' }).click();

  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(7);
  await expect(page.getByRole('cell', { name: 'Emisión de póliza' })).toBeVisible();
});

test('sin sesión la ruta de auditoría redirige al login', async ({ page }) => {
  await page.goto('/operador/auditoria-emision');
  await expect(page).toHaveURL(/\/login$/);
});

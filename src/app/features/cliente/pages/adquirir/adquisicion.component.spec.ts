import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Cotizacion } from '../../../../core/models/cotizacion';
import { AdquisicionService } from '../../../../core/services/adquisicion.service';
import { CotizacionService } from '../../../../core/services/cotizacion.service';
import { ConfirmacionComponent } from './confirmacion/confirmacion.component';
import { FirmaComponent } from './firma/firma.component';
import { PagoComponent } from './pago/pago.component';

const COTIZACION = {
  cotizacion_id: 'q-1',
  cliente_id: 'cliente-1',
  producto_codigo: 'VIAJE',
  moneda: 'COP',
} as Cotizacion;
const FIRMA = '/api/v1/bff-web/cotizaciones/q-1/firma-digital';
const RESUMEN = '/api/v1/bff-web/cotizaciones/q-1/resumen-pago';
const POLIZA = '/api/v1/bff-web/cotizaciones/q-1/poliza';
const CERTIFICADO = '/api/v1/bff-web/polizas/pol-1/certificado';
const PAGO = {
  pago_id: 'p-1',
  cotizacion_id: 'q-1',
  cliente_id: 'cliente-1',
  estado: 'PENDIENTE',
  codigo_rechazo: null,
};
const RESUMEN_DATOS = {
  cotizacion_id: 'q-1',
  prima_total: '125000',
  moneda: 'COP',
  expira_en: '2099-01-01',
  metodos_pago: [
    { codigo: 'PAYPAL', por_defecto: true },
    { codigo: 'TARJETA_CREDITO', por_defecto: false },
  ],
};
const POLIZA_DATOS = {
  poliza_id: 'pol-1',
  numero: '001',
  estado: 'EMITIDA',
  cotizacion_id: 'q-1',
  titular_nombre: 'Cliente de prueba',
  vigencia_desde: '2026-01-01T12:00:00Z',
  vigencia_hasta: '2027-01-01T12:00:00Z',
  prima: '125000',
  moneda: 'COP',
  estado_certificado: 'GENERADO',
};

describe('Flujo de adquisición', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FirmaComponent, PagoComponent, ConfirmacionComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(CotizacionService).ultima.set(COTIZACION);
    vi.spyOn(TestBed.inject(AuthService), 'email', 'get').mockReturnValue('cliente@sesion.com');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function prepararPago() {
    const fixture = TestBed.createComponent(PagoComponent);
    fixture.detectChanges();
    http.expectOne(FIRMA).flush({ estado: 'CAPTURADA' });
    await vi.waitFor(() => http.expectOne(RESUMEN).flush(RESUMEN_DATOS));
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function valor(el: HTMLElement, selector: string, texto: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  it('solo habilita avanzar tras confirmar la firma capturada', async () => {
    const fixture = TestBed.createComponent(FirmaComponent);
    fixture.detectChanges();
    http.expectOne('/api/v1/bff-web/productos').flush([{ codigo: 'VIAJE', producto_id: 'prod-1' }]);
    await vi.waitFor(() =>
      http.expectOne(FIRMA).flush(null, { status: 404, statusText: 'Not Found' }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Consultar firma');
    expect(el.textContent).not.toContain('Reintentar carga');
    expect(
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Siguiente paso'),
      )?.disabled,
    ).toBe(true);

    const canvas = el.querySelector('canvas')!;
    const contexto = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(contexto as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 220,
    } as DOMRect);
    canvas.setPointerCapture = vi.fn();
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['firma'], { type: 'image/png' })),
    );
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 20, clientY: 20 }));
    fixture.detectChanges();
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Enviar firma'))!
      .click();
    await vi.waitFor(() => {
      const req = http.expectOne(FIRMA);
      expect(req.request.method).toBe('POST');
      expect((req.request.body as FormData).get('producto_id')).toBe('prod-1');
      req.flush({ estado: 'CAPTURADA' });
    });
    await vi.waitFor(() =>
      http.expectOne(FIRMA).flush('error', { status: 503, statusText: 'Unavailable' }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('No pudimos confirmar la firma');
    });
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Enviar firma'))!
      .click();
    await vi.waitFor(() => {
      const req = http.expectOne(FIRMA);
      expect(req.request.method).toBe('GET');
      req.flush({ estado: 'CAPTURADA' });
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('firma fue capturada y confirmada');
    expect(
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Siguiente paso'),
      )?.disabled,
    ).toBe(false);
  });

  it('recupera la carga del producto desde Enviar firma sin botones adicionales', async () => {
    const fixture = TestBed.createComponent(FirmaComponent);
    fixture.detectChanges();
    http
      .expectOne('/api/v1/bff-web/productos')
      .flush('error', { status: 503, statusText: 'Unavailable' });
    const el = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('No pudimos consultar el producto');
    });
    expect(el.textContent).not.toContain('Reintentar carga');
    const canvas = el.querySelector('canvas')!;
    const contexto = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(contexto as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 220,
    } as DOMRect);
    canvas.setPointerCapture = vi.fn();
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['firma'], { type: 'image/png' })),
    );
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 20, clientY: 20 }));
    fixture.detectChanges();
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Enviar firma'))!
      .click();
    http.expectOne('/api/v1/bff-web/productos').flush([{ codigo: 'VIAJE', producto_id: 'prod-1' }]);
    await vi.waitFor(() =>
      http.expectOne(FIRMA).flush(null, { status: 404, statusText: 'Not Found' }),
    );
    await vi.waitFor(() => {
      const req = http.expectOne(FIRMA);
      expect(req.request.method).toBe('POST');
      req.flush({ estado: 'CAPTURADA' });
    });
    await vi.waitFor(() => http.expectOne(FIRMA).flush({ estado: 'CAPTURADA' }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('firma fue capturada y confirmada');
    });
  });

  it('paga con PayPal y espera aprobación antes de continuar', async () => {
    const { fixture, el } = await prepararPago();
    expect(el.querySelector<HTMLInputElement>('#valor-pago')?.readOnly).toBe(true);
    expect(el.querySelector<HTMLInputElement>('#paypal-email')?.value).toBe('cliente@sesion.com');
    valor(el, '#paypal-email', 'cliente@example.com');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    const post = http.expectOne('/api/v1/bff-web/pagos');
    expect(post.request.body).toEqual({
      cotizacion_id: 'q-1',
      cliente_id: 'cliente-1',
      metodo_pago: 'PAYPAL',
      paypal_email: 'cliente@example.com',
    });

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Pago en curso');
    post.flush(PAGO);
    await vi.waitFor(() =>
      http.expectOne('/api/v1/bff-web/pagos/p-1').flush({ ...PAGO, estado: 'APROBADO' }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Pago aprobado');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Pagar'),
    ).toBeUndefined();
    expect(
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Siguiente paso'),
      )?.disabled,
    ).toBe(false);
  });

  it('oculta el formulario al recuperar un pago aprobado y permite continuar', async () => {
    TestBed.inject(AdquisicionService).guardarIntento('q-1', {
      clave: 'clave',
      pago: { ...PAGO, estado: 'APROBADO' },
      confirmado: true,
    });
    const { el } = await prepararPago();
    expect(el.textContent).toContain('Pago aprobado');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Siguiente paso'),
      )?.disabled,
    ).toBe(false);
    http.expectNone('/api/v1/bff-web/pagos/p-1');
  });

  it('mantiene bloqueado un pago pendiente si falla la consulta y permite recuperarlo', async () => {
    const { fixture, el } = await prepararPago();
    valor(el, '#paypal-email', 'cliente@example.com');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    http.expectOne('/api/v1/bff-web/pagos').flush(PAGO);
    await vi.waitFor(() =>
      http
        .expectOne('/api/v1/bff-web/pagos/p-1')
        .flush('error', { status: 503, statusText: 'Unavailable' }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('No pudimos consultar el pago');
    });
    expect(
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Pagar')
        ?.disabled,
    ).toBe(true);
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Consultar pago'))!
      .click();
    http.expectOne('/api/v1/bff-web/pagos/p-1').flush({ ...PAGO, estado: 'APROBADO' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('Pago aprobado');
    });
    http.expectNone('/api/v1/bff-web/pagos');
  });

  it('exige consultar el estado aun cuando el envío inicial retorne aprobado', async () => {
    const { fixture, el } = await prepararPago();
    valor(el, '#paypal-email', 'cliente@example.com');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    http.expectOne('/api/v1/bff-web/pagos').flush({ ...PAGO, estado: 'APROBADO' });
    await vi.waitFor(() =>
      http
        .expectOne('/api/v1/bff-web/pagos/p-1')
        .flush('error', { status: 503, statusText: 'Unavailable' }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('No pudimos consultar el pago');
    });
    expect(
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Siguiente paso'),
      )?.disabled,
    ).toBe(true);
    expect(TestBed.inject(AdquisicionService).intento('q-1')?.confirmado).toBe(false);
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Consultar pago'))!
      .click();
    http.expectOne('/api/v1/bff-web/pagos/p-1').flush({ ...PAGO, estado: 'APROBADO' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('Pago aprobado');
    });
    expect(TestBed.inject(AdquisicionService).intento('q-1')?.confirmado).toBe(true);
  });

  it('valida datos de tarjeta y reutiliza la clave al reintentar un envío incierto', async () => {
    const { fixture, el } = await prepararPago();
    const tarjeta = el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1];
    tarjeta.click();
    fixture.detectChanges();
    valor(el, '#numero-tarjeta', '4111111111111111');
    valor(el, '#vencimiento', '1299');
    valor(el, '#cvv', '123');
    expect(el.querySelector<HTMLInputElement>('#numero-tarjeta')?.value).toBe(
      '4111 1111 1111 1111',
    );
    expect(el.querySelector<HTMLInputElement>('#vencimiento')?.value).toBe('12/99');
    expect(el.querySelector<HTMLInputElement>('#cvv')?.type).toBe('password');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const post = http.expectOne('/api/v1/bff-web/pagos');
    const clave = post.request.headers.get('Idempotency-Key');
    expect(post.request.body).toEqual({
      cotizacion_id: 'q-1',
      cliente_id: 'cliente-1',
      metodo_pago: 'TARJETA_CREDITO',
      numero_tarjeta: '4111111111111111',
      mes_expiracion: 12,
      anio_expiracion: 2099,
      cvv: '123',
    });

    post.flush('error', { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('No se pudo confirmar el envío');
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar envío'))!
      .click();
    const retry = http.expectOne('/api/v1/bff-web/pagos');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(clave);
    retry.flush({ ...PAGO, estado: 'RECHAZADO', codigo_rechazo: 'DECLINADA' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('DECLINADA');
    expect(
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Pagar')
        ?.disabled,
    ).toBe(false);
  });

  it('limita y valida los campos de tarjeta con y sin formato', async () => {
    const { fixture, el } = await prepararPago();
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    fixture.detectChanges();
    valor(el, '#numero-tarjeta', '4111-1111 1111 1111 987654');
    valor(el, '#vencimiento', '1329');
    valor(el, '#cvv', '12a345');
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('#numero-tarjeta')?.value).toBe(
      '4111 1111 1111 1111 987',
    );
    expect(el.querySelector<HTMLInputElement>('#vencimiento')?.value).toBe('13/29');
    expect(el.querySelector<HTMLInputElement>('#cvv')?.value).toBe('123');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(el.textContent).toContain('Ingresa una fecha válida');
    http.expectNone('/api/v1/bff-web/pagos');
    valor(el, '#vencimiento', '0100');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(el.textContent).toContain('La tarjeta está vencida');
    http.expectNone('/api/v1/bff-web/pagos');
  });

  it('precarga el correo de sesión, permite editarlo y exige un correo válido', async () => {
    const { fixture, el } = await prepararPago();
    const correo = el.querySelector<HTMLInputElement>('#paypal-email')!;
    expect(correo.type).toBe('email');
    expect(correo.value).toBe('cliente@sesion.com');
    valor(el, '#paypal-email', 'correo invalido');
    el.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(el.textContent).toContain('Ingresa un correo válido');
    http.expectNone('/api/v1/bff-web/pagos');
    valor(el, '#paypal-email', 'otro@example.com');
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    fixture.detectChanges();
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click();
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('#paypal-email')?.value).toBe('otro@example.com');
  });

  it('no muestra la póliza hasta que el certificado esté disponible y permite descargarlo', async () => {
    const api = TestBed.inject(AdquisicionService);
    api.guardarIntento('q-1', {
      clave: 'clave',
      pago: { ...PAGO, estado: 'APROBADO' },
      confirmado: true,
    });
    const fixture = TestBed.createComponent(ConfirmacionComponent);
    fixture.detectChanges();
    const req = http.expectOne(POLIZA);
    expect(req.request.headers.get('X-Client-Id')).toBe('cliente-1');
    req.flush(POLIZA_DATOS);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]'),
      ).not.toBeNull();
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Cliente de prueba');
      http.expectOne(CERTIFICADO).flush({
        poliza_id: 'pol-1',
        estado_certificado: 'GENERADO',
        disponible: true,
        ultima_generacion: { estado: 'GENERADO', error_codigo: null },
      });
    });
    const el = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.textContent).toContain('Cliente de prueba');
    });
    expect(el.textContent).toContain('01/01/2026');
    const detalles = el.querySelector('.confirmacion__detalles')!;
    expect(detalles.textContent).toContain('001');
    expect(detalles.textContent).not.toContain('pol-1');
    expect(detalles.textContent).toContain('01/01/2026 – 01/01/2027');
    expect(detalles.querySelectorAll('dt')).toHaveLength(4);
    expect(detalles.textContent).not.toContain('Inicio de vigencia');
    expect(el.textContent).toContain('Prima mensual');
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:certificado');
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Descargar certificado'))!
      .click();
    const descarga = http.expectOne(`${CERTIFICADO}/descarga`);
    expect(descarga.request.responseType).toBe('blob');
    descarga.flush(new Blob(['pdf'], { type: 'application/pdf' }));
    await fixture.whenStable();
    expect(crear).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revocar).toHaveBeenCalledWith('blob:certificado');
  });

  it('mantiene la emisión bloqueada mientras el certificado no esté disponible', async () => {
    TestBed.inject(AdquisicionService).guardarIntento('q-1', {
      clave: 'clave',
      pago: { ...PAGO, estado: 'APROBADO' },
      confirmado: true,
    });
    const fixture = TestBed.createComponent(ConfirmacionComponent);
    fixture.detectChanges();
    http.expectOne(POLIZA).flush(POLIZA_DATOS);
    await vi.waitFor(() =>
      http.expectOne(CERTIFICADO).flush({
        poliza_id: 'pol-1',
        estado_certificado: 'PENDIENTE',
        disponible: false,
        ultima_generacion: { estado: 'EN_PROCESO', error_codigo: null },
      }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[role="dialog"]')?.textContent).toContain(
        'Certificado PDF: PENDIENTE',
      );
      expect(el.textContent).not.toContain('Cliente de prueba');
    });
    fixture.destroy();
  });

  it('informa un certificado fallido y deja consultar de nuevo', async () => {
    TestBed.inject(AdquisicionService).guardarIntento('q-1', {
      clave: 'clave',
      pago: { ...PAGO, estado: 'APROBADO' },
      confirmado: true,
    });
    const fixture = TestBed.createComponent(ConfirmacionComponent);
    fixture.detectChanges();
    http.expectOne(POLIZA).flush(POLIZA_DATOS);
    await vi.waitFor(() =>
      http.expectOne(CERTIFICADO).flush({
        poliza_id: 'pol-1',
        estado_certificado: 'PENDIENTE',
        disponible: false,
        ultima_generacion: { estado: 'FALLIDO', error_codigo: 'PDF_ERROR' },
      }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Falló la generación del certificado');
      expect(el.textContent).toContain('FALLIDO');
      expect(el.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  it('no inicia emisión si no existe pago aprobado', async () => {
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ConfirmacionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'pago']);
    http.expectNone(POLIZA);
  });

  it('no inicia emisión si la aprobación no fue consultada', async () => {
    TestBed.inject(AdquisicionService).guardarIntento('q-1', {
      clave: 'clave',
      pago: { ...PAGO, estado: 'APROBADO' },
      confirmado: false,
    });
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ConfirmacionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'pago']);
    http.expectNone(POLIZA);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Cotizacion } from '../../../../../core/models/cotizacion';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { IdentidadComponent } from './identidad.component';

const COTIZACION = {
  cotizacion_id: 'q-1',
  cliente_id: 'cli-1',
  producto_codigo: 'VIAJE',
} as Cotizacion;

const BASE = '/api/v1/bff-web/clientes/cli-1';

describe('IdentidadComponent', () => {
  async function setup(estadoKyc: string | null, cotizacion: Cotizacion | null = COTIZACION) {
    await TestBed.configureTestingModule({
      imports: [IdentidadComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(CotizacionService).ultima.set(cotizacion);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const navUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(IdentidadComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    if (estadoKyc) {
      const req = http.expectOne(`${BASE}/perfil`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'cli-1', estado_kyc: estadoKyc });
      await fixture.whenStable();
      fixture.detectChanges();
    }
    return { fixture, http, nav, navUrl, el: fixture.nativeElement as HTMLElement };
  }

  const q = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

  const enviar = (el: HTMLElement) =>
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  function elegir(el: HTMLElement, id: string, archivo: File) {
    const input = el.querySelector<HTMLInputElement>(id)!;
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  const FRONTAL = new File(['a'], 'frente.jpg', { type: 'image/jpeg' });
  const REVERSO = new File(['b'], 'reverso.png', { type: 'image/png' });

  it('con KYC validado solo informa la verificación previa y permite continuar', async () => {
    const { el, nav } = await setup('VALIDADO');

    expect(q(el, 'ya-verificado')?.textContent).toContain('ya fue verificada');
    expect(el.querySelector('input[type="file"]')).toBeNull();
    q(el, 'siguiente')!.click();
    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'pago']);
  });

  it('sin KYC pide las dos fotos y habilita el botón al tenerlas', async () => {
    const { fixture, el } = await setup('PENDIENTE');

    const iniciar = q(el, 'iniciar') as HTMLButtonElement;
    expect(iniciar.disabled).toBe(true);
    elegir(el, '#doc-frontal', FRONTAL);
    fixture.detectChanges();
    expect(iniciar.disabled).toBe(true);
    expect(el.querySelector('[data-testid="preview-frontal"] img')?.getAttribute('alt')).toContain(
      'frontal',
    );
    elegir(el, '#doc-reverso', REVERSO);
    fixture.detectChanges();
    expect(iniciar.disabled).toBe(false);
    expect(el.querySelector('[data-testid="preview-reverso"] img')?.getAttribute('alt')).toContain(
      'reverso',
    );
  });

  it('rechaza archivos que no son imágenes', async () => {
    const { fixture, el } = await setup('PENDIENTE');

    elegir(el, '#doc-frontal', new File(['x'], 'doc.pdf', { type: 'application/pdf' }));
    fixture.detectChanges();

    expect(el.querySelector('.field__error')?.textContent).toContain('Selecciona una imagen');
    expect((q(el, 'iniciar') as HTMLButtonElement).disabled).toBe(true);
  });

  const verificacion = (estado: string) => ({
    verificacion_id: 'v-1',
    cliente_id: 'cli-1',
    resultado_kyc: estado,
    resultado_aml: estado,
    estado,
  });

  /** Sube las fotos, inicia la verificación y responde a la consulta con `estado`. */
  async function verificar(ctx: Awaited<ReturnType<typeof setup>>, estado: string) {
    elegir(ctx.el, '#doc-frontal', FRONTAL);
    elegir(ctx.el, '#doc-reverso', REVERSO);
    ctx.fixture.detectChanges();
    enviar(ctx.el);
    const req = ctx.http.expectOne(`${BASE}/verificaciones-kyc-aml`);
    expect(req.request.method).toBe('POST');
    const cuerpo = req.request.body as FormData;
    expect(cuerpo.get('cotizacion_id')).toBe(COTIZACION.cotizacion_id);
    expect((cuerpo.get('documento_frontal') as File).name).toBe('frente.jpg');
    expect((cuerpo.get('documento_reverso') as File).name).toBe('reverso.png');
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    req.flush({ verificacion_id: 'v-1', estado: 'INICIADA', fecha: '2026-10-25T10:00:00Z' });
    await vi.waitFor(() => {
      const consulta = ctx.http.expectOne(`${BASE}/verificaciones-kyc-aml/v-1`);
      expect(consulta.request.method).toBe('GET');
      consulta.flush(verificacion(estado));
    });
    await ctx.fixture.whenStable();
    ctx.fixture.detectChanges();
  }

  it('muestra la aprobación y permite continuar', async () => {
    const ctx = await setup('PENDIENTE');
    await verificar(ctx, 'APROBADO');

    expect(q(ctx.el, 'resultado-aprobado')).not.toBeNull();
    q(ctx.el, 'siguiente')!.click();
    expect(ctx.nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'pago']);
  });

  it('muestra el rechazo sin permitir continuar y deja reintentar', async () => {
    const ctx = await setup('PENDIENTE');
    await verificar(ctx, 'RECHAZADO');

    expect(q(ctx.el, 'resultado-rechazado')).not.toBeNull();
    expect(q(ctx.el, 'siguiente')).toBeNull();
    q(ctx.el, 'reintentar')!.click();
    ctx.fixture.detectChanges();
    expect(q(ctx.el, 'iniciar')).not.toBeNull();
  });

  it('vuelve al catálogo si no hay cotización en memoria', async () => {
    const { navUrl } = await setup(null, null);

    expect(navUrl).toHaveBeenCalledWith('/cliente/adquirir');
  });
});

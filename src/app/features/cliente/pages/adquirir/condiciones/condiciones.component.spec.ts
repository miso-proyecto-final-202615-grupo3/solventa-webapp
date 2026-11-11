import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Cotizacion } from '../../../../../core/models/cotizacion';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { CondicionesComponent } from './condiciones.component';

const COTIZACION = {
  cotizacion_id: 'q-1',
  cliente_id: 'cli-1',
  producto_codigo: 'VIAJE',
} as Cotizacion;

const CONDICIONES = {
  condiciones_cotizacion_id: 'cc-1',
  cotizacion_id: 'q-1',
  version_condiciones_generales: 'v2',
  condiciones_generales: 'CLÁUSULA PRIMERA\n\nEl asegurado debe pagar.\n\n- Punto uno\n- Punto dos',
  condiciones_particulares: { plazo_meses: 12 },
  creada_en: '2026-10-25T10:00:00Z',
  ultima_decision: null,
};

const URL = '/api/v1/bff-web/cotizaciones/q-1/condiciones';

describe('CondicionesComponent', () => {
  async function setup(cotizacion: Cotizacion | null = COTIZACION) {
    await TestBed.configureTestingModule({
      imports: [CondicionesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(CotizacionService).ultima.set(cotizacion);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const navUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CondicionesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http, nav, navUrl, el: fixture.nativeElement as HTMLElement };
  }

  async function cargar(condiciones: object = CONDICIONES) {
    const ctx = await setup();
    const req = ctx.http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(condiciones);
    await ctx.fixture.whenStable();
    ctx.fixture.detectChanges();
    return ctx;
  }

  const enviar = (el: HTMLElement) =>
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  const siguiente = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('[data-testid="siguiente"]')!;

  it('muestra las condiciones formateadas y deshabilita Siguiente hasta aceptar', async () => {
    const { fixture, el } = await cargar();

    expect(el.querySelector('h3')?.textContent).toContain('CLÁUSULA PRIMERA');
    expect(el.querySelectorAll('.adq__legal li').length).toBe(2);
    expect(el.querySelector('[data-testid="condiciones-particulares"]')?.textContent).toContain(
      'Plazo meses',
    );
    expect(siguiente(el).disabled).toBe(true);

    const check = el.querySelector<HTMLInputElement>('#aceptar-condiciones')!;
    check.click();
    fixture.detectChanges();
    expect(siguiente(el).disabled).toBe(false);
  });

  it('registra la aceptación y avanza a la verificación de identidad', async () => {
    const { fixture, http, nav, el } = await cargar();
    el.querySelector<HTMLInputElement>('#aceptar-condiciones')!.click();
    fixture.detectChanges();

    enviar(el);
    const req = http.expectOne(`${URL}/decisiones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ condiciones_cotizacion_id: 'cc-1', decision: 'ACEPTADA' });
    req.flush({});
    await fixture.whenStable();

    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'identidad']);
  });

  it('registra el rechazo y vuelve al catálogo', async () => {
    const { fixture, http, navUrl, el } = await cargar();

    el.querySelector<HTMLButtonElement>('[data-testid="rechazar"]')!.click();
    const req = http.expectOne(`${URL}/decisiones`);
    expect(req.request.body.decision).toBe('RECHAZADA');
    req.flush({});
    await fixture.whenStable();

    expect(navUrl).toHaveBeenCalledWith('/cliente/adquirir');
  });

  it('no avanza si falla el registro de la decisión', async () => {
    const { fixture, http, nav, el } = await cargar();
    el.querySelector<HTMLInputElement>('#aceptar-condiciones')!.click();
    fixture.detectChanges();

    enviar(el);
    http.expectOne(`${URL}/decisiones`).flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(nav).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="error"]')?.textContent).toContain(
      'No pudimos registrar tu decisión',
    );
  });

  it('precarga la aceptación previa y no la vuelve a registrar', async () => {
    const { fixture, http, nav, el } = await cargar({
      ...CONDICIONES,
      ultima_decision: { decision: 'ACEPTADA' },
    });

    expect(siguiente(el).disabled).toBe(false);
    enviar(el);
    await fixture.whenStable();

    http.expectNone(`${URL}/decisiones`);
    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'identidad']);
  });

  it('vuelve al catálogo si no hay cotización en memoria', async () => {
    const { navUrl } = await setup(null);

    expect(navUrl).toHaveBeenCalledWith('/cliente/adquirir');
  });
});

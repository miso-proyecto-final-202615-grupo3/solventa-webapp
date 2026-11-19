import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PASOS_PLAYGROUND } from './playground.catalog';
import { PlaygroundComponent } from './playground.component';
import { RespuestaHttp } from './playground.models';
import { PlaygroundService } from './playground.service';

describe('PlaygroundComponent', () => {
  const respuesta = (estado: number, cuerpo: unknown = {}): RespuestaHttp => ({
    estado,
    headers: { 'content-type': 'application/json' },
    cuerpo,
    contenido: JSON.stringify(cuerpo, null, 2),
    ms: 12,
  });

  async function setup(enviar: PlaygroundService['enviar']) {
    await TestBed.configureTestingModule({
      imports: [PlaygroundComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlaygroundService, useValue: { enviar } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!;

  afterEach(() => vi.useRealTimers());

  it('lista cada API en el panel lateral y muestra la URL, headers y payload de la primera', async () => {
    const { el } = await setup(vi.fn());
    expect(el.querySelectorAll('.pg__item').length).toBe(PASOS_PLAYGROUND.length);
    expect(el.querySelector('.pg__url-valor')?.textContent).toContain(
      '/api/v1/bff-web/clientes/autenticar',
    );
    expect(el.querySelector<HTMLTextAreaElement>('#headers')?.value).toContain('X-Correlation-Id');
    expect(el.querySelector<HTMLTextAreaElement>('#payload')?.value).toContain('"correo"');
  });

  it('muestra las fases consecutivas y 24 pasos sin los campos de URL base ni salud', async () => {
    const { fixture, el } = await setup(vi.fn());
    expect(
      Array.from(el.querySelectorAll('.pg__grupo'), (grupo) => grupo.textContent?.trim()),
    ).toEqual([
      'Fase 1 - Socio',
      'Fase 2 - Prospecto',
      'Fase 3 - Catálogo',
      'Fase 4 - Cotización',
      'Fase 5 - Condiciones',
      'Fase 6 - Identidad KYC/AML',
      'Fase 7 - Firma digital',
      'Fase 8 - Pago',
      'Fase 9 - Póliza',
      'Fase 10 - Certificado',
    ]);
    expect(el.querySelector('#base-socios')).toBeNull();
    expect(el.querySelector('#base-web')).toBeNull();
    expect(el.textContent).not.toContain('Consultar salud');
    expect(el.textContent).not.toContain('Consultar raíz');
    expect(el.querySelector('.pg__paso')?.textContent).toContain('Paso 1 de 24');
    boton(el, 'Descargar certificado').click();
    fixture.detectChanges();
    expect(el.querySelector('.pg__paso')?.textContent).toContain('Paso 24 de 24');
  });

  it('muestra código, headers y payload de la respuesta al ejecutar', async () => {
    const { fixture, el } = await setup(
      vi.fn().mockResolvedValue(respuesta(401, { detail: 'no' })),
    );
    boton(el, 'Ejecutar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.pg__codigo')?.textContent).toContain('HTTP 401');
    expect(el.querySelector('[aria-labelledby="resp-headers-etiqueta"]')?.textContent).toContain(
      'content-type',
    );
    expect(el.querySelector('[aria-labelledby="resp-payload-etiqueta"]')?.textContent).toContain(
      '"detail": "no"',
    );
  });

  it('Play recorre las APIs en orden con 5 segundos de espera y cambia la selección', async () => {
    vi.useFakeTimers();
    const enviar = vi.fn().mockResolvedValue(respuesta(200, { id: 'x', access_token: 't' }));
    const { fixture, el } = await setup(enviar);

    boton(el, 'Play').click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(enviar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(4999);
    expect(enviar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('Registrar socio');

    boton(el, 'Detener').click();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it('Play se detiene ante una respuesta de error', async () => {
    vi.useFakeTimers();
    const enviar = vi.fn().mockResolvedValue(respuesta(500));
    const { fixture, el } = await setup(enviar);
    boton(el, 'Play').click();
    await vi.advanceTimersByTimeAsync(30_000);
    fixture.detectChanges();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(boton(el, 'Play')).toBeTruthy();
  });

  it('Play termina al descargar el certificado sin ejecutar salud ni raíz', async () => {
    vi.useFakeTimers();
    const enviar = vi.fn().mockResolvedValue(
      respuesta(200, {
        id: 'id',
        access_token: 'token',
        api_key: 'key',
        producto_id: 'producto',
        cotizacion_id: 'cotizacion',
        condiciones_cotizacion_id: 'condiciones',
        verificacion_id: 'verificacion',
        firma_id: 'firma',
        pago_id: 'pago',
        poliza_id: 'poliza',
        estado_certificado: 'GENERADO',
      }),
    );
    const { fixture, el } = await setup(enviar);
    boton(el, 'Play').click();
    await vi.advanceTimersByTimeAsync(115_000);
    fixture.detectChanges();
    expect(enviar).toHaveBeenCalledTimes(24);
    expect(enviar.mock.calls.at(-1)?.[0].url).toBe(
      `${location.origin}/api/v1/bff-socios/polizas/poliza/certificado/descarga`,
    );
    expect(el.querySelector('.pg__paso')?.textContent).toContain('Paso 24 de 24');
    expect(boton(el, 'Play')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(enviar).toHaveBeenCalledTimes(24);
  });
});

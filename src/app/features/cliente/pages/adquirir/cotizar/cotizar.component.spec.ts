import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { CotizarComponent } from './cotizar.component';

const PRODUCTO = {
  producto_id: 'p-1',
  codigo: 'VIAJE',
  nombre: 'Seguro de viaje',
  ramo: 'Viajes',
  pais: 'CO',
  estado: 'ACTIVO',
  moneda: 'COP',
  mensaje_legal: 'Condiciones sujetas a póliza.',
  fuentes_datos: [],
  parametros: [
    { nombre: 'dias', etiqueta: 'Días de viaje', tipo: 'integer', minimo: '1', maximo: '90' },
    { nombre: 'salida', etiqueta: 'Salida', tipo: 'date' },
    { nombre: 'deportes', etiqueta: 'Deportes de riesgo', tipo: 'boolean', requerido: false },
    { nombre: 'nota', etiqueta: 'Nota', tipo: 'string', requerido: false },
  ],
  coberturas: [],
};

describe('CotizarComponent', () => {
  async function setup() {
    sessionStorage.clear();
    sessionStorage.setItem(
      'solventa.auth',
      JSON.stringify({ token: 't', email: 'ana@correo.com' }),
    );
    await TestBed.configureTestingModule({
      imports: [CotizarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['codigo', 'VIAJE']]) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CotizarComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bff-web/productos').flush([PRODUCTO]);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, http };
  }

  function escribir(el: HTMLElement, id: string, valor: string) {
    const input = el.querySelector<HTMLInputElement>(`#par-${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('genera un campo por cada parámetro del producto', async () => {
    const { el } = await setup();

    expect(el.querySelector<HTMLInputElement>('#par-dias')?.type).toBe('number');
    expect(el.querySelector<HTMLInputElement>('#par-salida')?.type).toBe('date');
    expect(el.querySelector<HTMLInputElement>('#par-deportes')?.type).toBe('checkbox');
    expect(el.querySelector<HTMLInputElement>('#par-nota')?.type).toBe('text');
    expect(el.textContent).toContain('Condiciones sujetas a póliza.');
  });

  it('no envía si faltan datos obligatorios o están fuera de rango', async () => {
    const { fixture, el, http } = await setup();
    escribir(el, 'dias', '120');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http.expectNone('/api/v1/bff-web/cotizaciones');
    expect(el.textContent).toContain('El valor máximo es 90');
    expect(el.textContent).toContain('Este dato es obligatorio.');
  });

  it('envía la solicitud con el cliente de la sesión y navega al resultado', async () => {
    const { fixture, el, http } = await setup();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir(el, 'dias', '14');
    escribir(el, 'salida', '2026-10-14');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi
      .waitFor(() => http.expectOne((r) => r.params.get('correo') === 'ana@correo.com'))
      .then((req) => req.flush({ cliente: { id: 'cli-1' }, eventos: [] }));
    await vi
      .waitFor(() => http.expectOne('/api/v1/bff-web/cotizaciones'))
      .then((post) => {
        expect(post.request.body).toEqual({
          cliente_id: 'cli-1',
          producto_codigo: 'VIAJE',
          parametros: { dias: 14, salida: '2026-10-14', deportes: false },
        });
        post.flush({ cotizacion_id: 'q-1', producto_codigo: 'VIAJE' });
      });
    await fixture.whenStable();

    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIAJE', 'cotizacion']);
  });
});

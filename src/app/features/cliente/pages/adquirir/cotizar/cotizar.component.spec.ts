import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Producto } from '../../../../../core/models/cotizacion';
import { CotizarComponent } from './cotizar.component';

const PRODUCTO: Producto = {
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

const VIDA_HIPOTECARIO: Producto = {
  ...PRODUCTO,
  codigo: 'VIDA_HIPOTECARIO',
  parametros: [
    {
      nombre: 'saldo_credito',
      etiqueta: 'Saldo pendiente del crédito',
      tipo: 'number',
      requerido: true,
      minimo: '1',
      unidad: 'COP',
    },
    {
      nombre: 'ubicacion',
      etiqueta: 'Ubicación de la vivienda',
      descripcion: 'Municipio, zona y estrato del inmueble asegurado.',
      tipo: 'object',
      requerido: true,
    },
  ],
};

describe('CotizarComponent', () => {
  async function setup(producto: Producto = PRODUCTO) {
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
          useValue: { snapshot: { paramMap: new Map([['codigo', producto.codigo]]) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CotizarComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bff-web/productos').flush([producto]);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, http };
  }

  function escribir(el: HTMLElement, id: string, valor: string) {
    const input = el.querySelector<HTMLInputElement>(`#par-${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function seleccionar(el: HTMLElement, id: string, valor: string) {
    const select = el.querySelector<HTMLSelectElement>(`#par-${id}`)!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
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

  it('formatea el monto sin modificar otros campos numéricos', async () => {
    const producto: Producto = {
      ...PRODUCTO,
      parametros: [...PRODUCTO.parametros, VIDA_HIPOTECARIO.parametros[0]],
    };
    const { el } = await setup(producto);
    escribir(el, 'saldo_credito', '1000000,50');
    const monto = el.querySelector<HTMLInputElement>('#par-saldo_credito')!;
    expect(monto.type).toBe('text');
    expect(monto.inputMode).toBe('decimal');
    expect(monto.value).toBe('1.000.000,50');
    expect(el.querySelector<HTMLInputElement>('#par-dias')?.type).toBe('number');
  });

  it('valida montos inválidos y sus límites numéricos', async () => {
    const producto: Producto = {
      ...VIDA_HIPOTECARIO,
      parametros: [{ ...VIDA_HIPOTECARIO.parametros[0], minimo: '1000', maximo: '2000' }],
    };
    const { fixture, el, http } = await setup(producto);
    escribir(el, 'saldo_credito', 'abc');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Ingresa un monto válido');
    http.expectNone((r) => r.params.get('correo') === 'ana@correo.com');

    escribir(el, 'saldo_credito', '999');
    fixture.detectChanges();
    expect(el.textContent).toContain('El valor mínimo es 1000');
    escribir(el, 'saldo_credito', '2000,01');
    fixture.detectChanges();
    expect(el.textContent).toContain('El valor máximo es 2000');
    escribir(el, 'saldo_credito', '');
    fixture.detectChanges();
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

  it('muestra las capitales y los seis estratos para vida hipotecario', async () => {
    const { el } = await setup(VIDA_HIPOTECARIO);
    const municipios = el.querySelectorAll<HTMLOptionElement>('#par-ubicacion-municipio option');
    const estratos = el.querySelectorAll<HTMLOptionElement>('#par-ubicacion-estrato option');

    expect(Array.from(municipios, (option) => option.value)).toEqual([
      '',
      'Arauca',
      'Armenia',
      'Barranquilla',
      'Bogotá',
      'Bucaramanga',
      'Cali',
      'Cartagena',
      'Cúcuta',
      'Florencia',
      'Ibagué',
      'Inírida',
      'Leticia',
      'Manizales',
      'Medellín',
      'Mitú',
      'Mocoa',
      'Montería',
      'Neiva',
      'Pasto',
      'Pereira',
      'Popayán',
      'Puerto Carreño',
      'Quibdó',
      'Riohacha',
      'San Andrés',
      'San José del Guaviare',
      'Santa Marta',
      'Sincelejo',
      'Tunja',
      'Valledupar',
      'Villavicencio',
      'Yopal',
    ]);
    expect(Array.from(estratos, (option) => option.value)).toEqual([
      '',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    const zonas = el.querySelectorAll<HTMLOptionElement>('#par-ubicacion-zona option');
    expect(Array.from(zonas, (option) => option.value)).toEqual(['', 'URBANA', 'RURAL']);
    expect(Array.from(zonas, (option) => option.textContent?.trim())).toEqual([
      'Selecciona una zona',
      'Urbana',
      'Rural',
    ]);
  });

  it('exige los tres datos de ubicación y rechaza una zona no permitida', async () => {
    const { fixture, el, http } = await setup(VIDA_HIPOTECARIO);
    escribir(el, 'saldo_credito', '100');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Completa el municipio, la zona y el estrato.');
    seleccionar(el, 'ubicacion-municipio', 'Bogotá');
    seleccionar(el, 'ubicacion-estrato', '3');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectNone((r) => r.params.get('correo') === 'ana@correo.com');
    const select = el.querySelector<HTMLSelectElement>('#par-ubicacion-zona')!;
    const option = document.createElement('option');
    option.value = 'Otra';
    select.appendChild(option);
    seleccionar(el, 'ubicacion-zona', 'Otra');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectNone('/api/v1/bff-web/cotizaciones');
    http.expectNone((r) => r.params.get('correo') === 'ana@correo.com');
  });

  it.each(['URBANA', 'RURAL'])('envía la zona %s en el objeto de ubicación', async (zona) => {
    const { fixture, el, http } = await setup(VIDA_HIPOTECARIO);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir(el, 'saldo_credito', '1000000,50');
    seleccionar(el, 'ubicacion-municipio', 'Bogotá');
    seleccionar(el, 'ubicacion-zona', zona);
    seleccionar(el, 'ubicacion-estrato', '4');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi
      .waitFor(() => http.expectOne((r) => r.params.get('correo') === 'ana@correo.com'))
      .then((req) => req.flush({ cliente: { id: 'cli-1' }, eventos: [] }));
    await vi
      .waitFor(() => http.expectOne('/api/v1/bff-web/cotizaciones'))
      .then((post) => {
        expect(post.request.body).toEqual({
          cliente_id: 'cli-1',
          producto_codigo: 'VIDA_HIPOTECARIO',
          parametros: {
            saldo_credito: 1000000.5,
            ubicacion: { municipio: 'Bogotá', zona, estrato: 4 },
          },
        });
        post.flush({ cotizacion_id: 'q-1', producto_codigo: 'VIDA_HIPOTECARIO' });
      });
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith(['/cliente/adquirir', 'VIDA_HIPOTECARIO', 'cotizacion']);
  });

  it('no cambia la captura de un objeto de otro producto', async () => {
    const producto: Producto = { ...VIDA_HIPOTECARIO, codigo: 'HOGAR' };
    const { el } = await setup(producto);
    expect(el.querySelector<HTMLInputElement>('#par-ubicacion')?.type).toBe('text');
    expect(el.querySelector('#par-ubicacion-municipio')).toBeNull();
  });

  it('permite omitir una ubicación opcional, pero no enviarla incompleta', async () => {
    const producto: Producto = {
      ...VIDA_HIPOTECARIO,
      parametros: VIDA_HIPOTECARIO.parametros.map((p) =>
        p.nombre === 'ubicacion' ? { ...p, requerido: false } : p,
      ),
    };
    const { fixture, el, http } = await setup(producto);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir(el, 'saldo_credito', '100');
    seleccionar(el, 'ubicacion-municipio', 'Bogotá');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Completa el municipio, la zona y el estrato.');
    http.expectNone((r) => r.params.get('correo') === 'ana@correo.com');

    seleccionar(el, 'ubicacion-municipio', '');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await vi
      .waitFor(() => http.expectOne((r) => r.params.get('correo') === 'ana@correo.com'))
      .then((req) => req.flush({ cliente: { id: 'cli-1' }, eventos: [] }));
    await vi
      .waitFor(() => http.expectOne('/api/v1/bff-web/cotizaciones'))
      .then((post) => {
        expect(post.request.body.parametros).toEqual({ saldo_credito: 100 });
        post.flush({ cotizacion_id: 'q-1', producto_codigo: 'VIDA_HIPOTECARIO' });
      });
    await fixture.whenStable();
  });
});

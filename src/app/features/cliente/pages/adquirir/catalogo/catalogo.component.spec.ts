import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogoComponent } from './catalogo.component';

const PRODUCTO = {
  producto_id: 'p-1',
  codigo: 'VIAJE',
  nombre: 'Seguro de viaje',
  ramo: 'Viajes',
  pais: 'CO',
  estado: 'ACTIVO',
  moneda: 'COP',
  mensaje_legal: '',
  fuentes_datos: [],
  parametros: [],
  coberturas: [
    {
      cobertura_id: 'c-1',
      codigo: 'MED',
      nombre: 'Gastos médicos',
      limite_asegurado: '1000',
      deducible: '0',
    },
  ],
};

describe('CatalogoComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [CatalogoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CatalogoComponent);
    fixture.detectChanges();
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('lista los productos de GET /productos con enlace para cotizar', async () => {
    const { fixture, el, http } = await setup();
    http.expectOne('/api/v1/bff-web/productos').flush([PRODUCTO]);
    await fixture.whenStable();
    fixture.detectChanges();

    const tarjetas = el.querySelectorAll('[data-testid="producto"]');
    expect(tarjetas.length).toBe(1);
    expect(tarjetas[0].textContent).toContain('Seguro de viaje');
    expect(tarjetas[0].textContent).toContain('Gastos médicos');
    expect(tarjetas[0].querySelector('a')?.getAttribute('href')).toBe('/VIAJE/cotizar');
  });

  it('muestra un error con opción de reintentar si el catálogo falla', async () => {
    const { fixture, el, http } = await setup();
    http
      .expectOne('/api/v1/bff-web/productos')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar');
    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    http.expectOne('/api/v1/bff-web/productos').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Por ahora no hay productos disponibles');
  });
});

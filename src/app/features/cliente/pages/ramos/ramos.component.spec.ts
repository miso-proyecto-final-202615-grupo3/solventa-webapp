import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RamosComponent } from './ramos.component';

const PRODUCTO = {
  producto_id: 'p1',
  codigo: 'VIDA_HIPOTECARIO',
  nombre: 'Vida hipotecario',
  ramo: 'VIDA',
  pais: 'CO',
  estado: 'ACTIVO',
  moneda: 'COP',
  mensaje_legal: 'Consultaremos tu información con tu consentimiento.',
  fuentes_datos: ['OPEN_FINANCE', 'OPEN_DATA'],
  parametros: [
    {
      nombre: 'valor_vivienda',
      etiqueta: 'Valor de la vivienda',
      descripcion: '',
      tipo: 'number',
      requerido: true,
      minimo: 1,
      maximo: null,
      unidad: 'COP',
    },
  ],
  coberturas: [],
};

async function montar(respuesta: unknown[] | 503) {
  TestBed.configureTestingModule({
    imports: [RamosComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(RamosComponent);
  fixture.detectChanges();
  const req = http.expectOne('/api/v1/bff-web/productos');
  if (respuesta === 503) {
    req.flush({}, { status: 503, statusText: 'Service Unavailable' });
  } else {
    req.flush(respuesta);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, http };
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  return Array.from(el.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  ) as HTMLButtonElement;
}

describe('RamosComponent', () => {
  it('lista los ramos disponibles', async () => {
    const { el } = await montar([PRODUCTO]);
    expect(el.querySelectorAll('.ramos__item').length).toBe(1);
    expect(el.textContent).toContain('Vida hipotecario');
  });

  it('muestra el mensaje legal y las fuentes en un modal', async () => {
    const { fixture, el } = await montar([PRODUCTO]);
    boton(el, 'Ver condiciones').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="mensaje-legal"]')?.textContent).toContain(
      'Consultaremos tu información',
    );
    expect(el.textContent).toContain('Open Finance y Open Data');

    boton(el, 'Cerrar').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('carga los campos de parámetros del ramo seleccionado', async () => {
    const { fixture, el } = await montar([PRODUCTO]);
    expect(el.querySelector('[data-testid="parametros"]')).toBeNull();

    boton(el, 'Seleccionar').click();
    fixture.detectChanges();

    const inputs = el.querySelectorAll<HTMLInputElement>('[data-testid="parametros"] input');
    expect(inputs.length).toBe(1);
    expect(inputs[0].name).toBe('valor_vivienda');
    expect(inputs[0].type).toBe('number');
    expect(inputs[0].required).toBe(true);
  });

  it('informa cuando el servicio no está disponible', async () => {
    const { el } = await montar(503);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('no disponible');
  });
});

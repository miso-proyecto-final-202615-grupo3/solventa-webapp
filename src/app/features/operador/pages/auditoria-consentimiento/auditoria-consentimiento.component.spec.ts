import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditoriaConsentimientoResponse } from '../../../../core/models/auditoria-consentimiento';
import { AuditoriaConsentimientoComponent } from './auditoria-consentimiento.component';

const URL = '/api/v1/bff-web/consentimientos';

function respuesta(): AuditoriaConsentimientoResponse {
  return {
    cliente: {
      id: 'c1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      tipo_documento: 'CC',
      numero_identificacion: '1020304050',
      correo: 'ana@example.com',
      estado_consentimiento: 'ACEPTADO',
    },
    eventos: [
      {
        id: 'e2',
        tipo_accion: 'REVOCACION',
        fecha: '2026-10-14T15:00:00Z',
        version_terminos: '1.0',
        canal: 'web',
      },
      {
        id: 'e1',
        tipo_accion: 'ACEPTACION',
        fecha: '2026-10-13T22:49:29Z',
        version_terminos: '1.0',
        canal: 'web',
      },
    ],
  };
}

describe('AuditoriaConsentimientoComponent', () => {
  let fixture: ComponentFixture<AuditoriaConsentimientoComponent>;
  let httpMock: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = () => el().querySelector('button[type="submit"]') as HTMLButtonElement;

  async function buscar(valor: string, criterio?: 'correo'): Promise<void> {
    if (criterio) {
      const select = el().querySelector('select') as HTMLSelectElement;
      select.value = criterio;
      select.dispatchEvent(new Event('change'));
    }
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    boton().click();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaConsentimientoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(AuditoriaConsentimientoComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('deshabilita Buscar mientras el valor esté vacío', () => {
    expect(boton().disabled).toBe(true);
  });

  it('busca por identidad y muestra el log en el orden recibido', async () => {
    await buscar('1020304050');

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('identificacion')).toBe('1020304050');
    req.flush(respuesta());
    await fixture.whenStable();
    fixture.detectChanges();

    const filas = Array.from(el().querySelectorAll('tbody tr'));
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Revocación');
    expect(filas[1].textContent).toContain('Aceptación');
    expect(filas[0].textContent).toContain('1.0');
    expect(filas[0].textContent).toContain('web');
    expect(el().textContent).toContain('Ana Pérez');
    expect(el().textContent).toContain('ACEPTADO');
  });

  it('busca por correo cuando se elige ese criterio', async () => {
    await buscar('ana@example.com', 'correo');

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('correo')).toBe('ana@example.com');
    req.flush(respuesta());
  });

  it('informa cuando el cliente no existe', async () => {
    await buscar('999999');

    httpMock
      .expectOne((r) => r.url === URL)
      .flush(
        { detail: 'No hay un cliente con ese dato.' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('No encontramos');
    expect(el().querySelector('table')).toBeNull();
  });

  it('indica cuando el cliente no tiene consentimientos', async () => {
    await buscar('1020304050');

    httpMock.expectOne((r) => r.url === URL).flush({ ...respuesta(), eventos: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().textContent).toContain('aún no tiene consentimientos');
  });

  it('es de solo lectura: no ofrece acciones de edición ni borrado', () => {
    const botones = Array.from(el().querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(botones).toEqual(['Buscar']);
  });
});

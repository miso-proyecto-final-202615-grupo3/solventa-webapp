import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClienteService } from './cliente.service';

const PAYLOAD = {
  nombres: 'Ana',
  apellidos: 'PÃ©rez',
  tipo_documento: 'CC' as const,
  numero_identificacion: '1020304050',
  correo: 'ana.perez@example.com',
  password: 'Secreta123',
  fecha_nacimiento: '1990-05-15',
  pais_residencia: 'Colombia',
  telefono: '3001234567',
  consentimiento_datos: true,
};

describe('ClienteService', () => {
  let service: ClienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe llamar a POST /api/v1/bff-web/clientes/registro', () => {
    service.registrar(PAYLOAD).subscribe((respuesta) => {
      expect(respuesta.correo).toBe(PAYLOAD.correo);
    });

    const request = httpMock.expectOne('/api/v1/bff-web/clientes/registro');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(PAYLOAD);

    request.flush({
      id: 'b7d771b4-1ccd-4dcd-943c-cbce8e739256',
      nombres: PAYLOAD.nombres,
      apellidos: PAYLOAD.apellidos,
      tipo_documento: 'CC',
      numero_identificacion: PAYLOAD.numero_identificacion,
      correo: PAYLOAD.correo,
      fecha_nacimiento: PAYLOAD.fecha_nacimiento,
      pais_residencia: PAYLOAD.pais_residencia,
      telefono: PAYLOAD.telefono,
      estado_kyc: 'PENDIENTE',
      fecha_creacion: '2026-10-10T22:12:41',
      fecha_actualizacion: '2026-10-10T22:12:41',
    });
  });

  it('debe propagar un error 409 del servidor', () => {
    service.registrar(PAYLOAD).subscribe({
      error: (err: { status: number }) => {
        expect(err.status).toBe(409);
      },
    });

    const request = httpMock.expectOne('/api/v1/bff-web/clientes/registro');
    request.flush(
      { detail: 'Ya existe un cliente con ese correo.' },
      { status: 409, statusText: 'Conflict' },
    );
  });

  it('debe propagar errores de red', () => {
    service.registrar(PAYLOAD).subscribe({
      error: (err: { status: number }) => {
        expect(err.status).toBe(0);
      },
    });

    const request = httpMock.expectOne('/api/v1/bff-web/clientes/registro');
    request.flush(new ErrorEvent('Network error'), {
      status: 0,
      statusText: 'Unknown Error',
    });
  });
});

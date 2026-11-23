import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { SocioService } from './socio.service';

describe('SocioService', () => {
  let service: SocioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: 'token-socios-admin' } },
      ],
    });
    service = TestBed.inject(SocioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía los datos al BFF con el token de sesión', () => {
    const payload = {
      nombre: 'Banco Andino',
      correo: 'contacto@bancoandino.com',
      tipo_socio: 'Banco',
      canal_integracion: 'API',
    };
    let resultado: unknown;

    service.registrar(payload).subscribe((socio) => (resultado = socio));

    const request = httpMock.expectOne('/api/v1/bff-web/socios');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-socios-admin');
    request.flush({
      ...payload,
      id: 'socio-1',
      estado: 'PENDIENTE',
      creado_en: '2026-11-16T15:00:00Z',
    });
    expect(resultado).toMatchObject({ id: 'socio-1', estado: 'PENDIENTE' });
  });

  it('genera credenciales para un socio', () => {
    let resultado: unknown;

    service.generarApiKey('socio-1').subscribe((credencial) => (resultado = credencial));

    const request = httpMock.expectOne('/api/v1/bff-web/socios/socio-1/api-keys');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-socios-admin');
    request.flush({
      api_key_id: 'key-1',
      api_key: 'secret-value',
      fecha_generacion: '2026-11-18T00:00:00Z',
    });

    expect(resultado).toEqual({
      api_key_id: 'key-1',
      api_key: 'secret-value',
      fecha_generacion: '2026-11-18T00:00:00Z',
    });
  });
});

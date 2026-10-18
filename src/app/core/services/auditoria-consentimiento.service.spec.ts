import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuditoriaConsentimientoService } from './auditoria-consentimiento.service';

const URL = '/api/v1/bff-web/consentimientos';

describe('AuditoriaConsentimientoService', () => {
  let service: AuditoriaConsentimientoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditoriaConsentimientoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('consulta por identificación con GET y query param', () => {
    service.consultar('identificacion', ' 1020304050 ').subscribe();

    const request = httpMock.expectOne((r) => r.url === URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('identificacion')).toBe('1020304050');
    expect(request.request.params.has('correo')).toBe(false);
    request.flush({ cliente: {}, eventos: [] });
  });

  it('consulta por correo', () => {
    service.consultar('correo', 'ana@example.com').subscribe();

    const request = httpMock.expectOne((r) => r.url === URL);
    expect(request.request.params.get('correo')).toBe('ana@example.com');
    request.flush({ cliente: {}, eventos: [] });
  });
});

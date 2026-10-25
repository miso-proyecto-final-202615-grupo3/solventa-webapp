import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CotizacionService } from './cotizacion.service';

const URL = '/api/v1/bff-web/cotizaciones';

describe('CotizacionService', () => {
  let service: CotizacionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CotizacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía la solicitud de cotización al BFF web', () => {
    const payload = {
      cliente_id: 'c8cff57a-ff9b-444d-a4df-907c4ba2a83a',
      ramo: 'VIDA_HIPOTECARIO' as const,
      consentimiento_version: '1.0',
      parametros: {
        saldo_credito: 200000000,
        ubicacion: { municipio: 'Bogotá D.C.', zona: 'URBANA' as const, estrato: 4 },
      },
    };

    service.cotizar(payload).subscribe();

    const request = httpMock.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ prima_mensual: 48046.25 });
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConsentimientoService } from './consentimiento.service';

describe('ConsentimientoService', () => {
  it('llama a PUT /clientes/{id}/consentimiento con el estado', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(ConsentimientoService)
      .actualizar('abc', 'REVOCADO')
      .subscribe((r) => expect(r.estado).toBe('REVOCADO'));

    const req = http.expectOne('/api/v1/bff-web/clientes/abc/consentimiento');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'REVOCADO' });
    req.flush({ cliente_id: 'abc', estado: 'REVOCADO', otorgado_en: null, revocado_en: 'x' });
    http.verify();
  });
});

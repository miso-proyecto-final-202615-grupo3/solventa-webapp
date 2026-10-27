import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductoService } from './producto.service';

describe('ProductoService', () => {
  it('llama a GET /productos', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(ProductoService)
      .listar()
      .subscribe((r) => expect(r[0].codigo).toBe('VIDA_HIPOTECARIO'));

    const req = http.expectOne('/api/v1/bff-web/productos');
    expect(req.request.method).toBe('GET');
    req.flush([{ codigo: 'VIDA_HIPOTECARIO' }]);
    http.verify();
  });
});

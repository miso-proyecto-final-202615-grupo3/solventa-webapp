import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RecuperacionClaveService } from './recuperacion-clave.service';

describe('RecuperacionClaveService', () => {
  let service: RecuperacionClaveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecuperacionClaveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('solicita un código de recuperación sin requerir sesión', () => {
    service.solicitar('ana@example.com').subscribe();

    const request = httpMock.expectOne('/api/v1/bff-web/clientes/recuperar-clave');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ correo: 'ana@example.com' });
    request.flush({ mensaje: 'Si existe una cuenta, enviaremos un código.' });
  });

  it('confirma el código y la nueva contraseña', () => {
    const payload = {
      correo: 'ana@example.com',
      codigo: '123456',
      nueva_clave: 'NuevaClave123',
    };
    service.confirmar(payload).subscribe();

    const request = httpMock.expectOne('/api/v1/bff-web/clientes/recuperar-clave/confirmar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ mensaje: 'Contraseña actualizada.' });
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthError, AuthService } from './auth.service';

const URL = '/api/v1/bff-web/clientes/autenticar';
const CREDENCIALES = { email: 'ana@correo.com', password: 'Secreta123' };

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('llama a POST /clientes/autenticar y queda autenticado', async () => {
    const promesa = service.login(CREDENCIALES);

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'ana@correo.com', password: 'Secreta123' });
    req.flush({ access_token: 'tok', id_token: 'id', token_type: 'Bearer' });
    await promesa;

    expect(service.authenticated()).toBe(true);
    expect(service.token).toBe('tok');
    expect(service.email).toBe('ana@correo.com');
  });

  it('traduce 401 a AuthError y no autentica', async () => {
    const promesa = service.login(CREDENCIALES);
    httpMock
      .expectOne(URL)
      .flush({ detail: 'Credenciales inválidas.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(promesa).rejects.toThrow(new AuthError('Correo o contraseña incorrectos.'));
    expect(service.authenticated()).toBe(false);
  });

  it('propaga otros errores (p. ej. 503) sin convertirlos en AuthError', async () => {
    const promesa = service.login(CREDENCIALES);
    httpMock.expectOne(URL).flush({}, { status: 503, statusText: 'Service Unavailable' });

    await expect(promesa).rejects.not.toBeInstanceOf(AuthError);
    expect(service.authenticated()).toBe(false);
  });

  it('rechaza credenciales vacías sin llamar al backend', async () => {
    await expect(service.login({ email: '', password: '' })).rejects.toBeInstanceOf(AuthError);
    httpMock.expectNone(URL);
  });

  it('logout limpia la sesión', async () => {
    const promesa = service.login(CREDENCIALES);
    httpMock.expectOne(URL).flush({ access_token: 'tok', id_token: 'id', token_type: 'Bearer' });
    await promesa;

    service.logout();

    expect(service.authenticated()).toBe(false);
    expect(service.token).toBeNull();
    expect(sessionStorage.getItem('solventa.auth')).toBeNull();
  });
});

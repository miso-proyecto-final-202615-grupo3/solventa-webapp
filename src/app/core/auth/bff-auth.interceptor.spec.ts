import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../../app.config';
import { AdquisicionService } from '../services/adquisicion.service';
import { AuditoriaConsentimientoService } from '../services/auditoria-consentimiento.service';
import { AuthService } from './auth.service';

const BASE = '/api/v1/bff-web';

describe('autorización del BFF', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    mock.verify();
    sessionStorage.clear();
  });

  async function iniciarSesion(): Promise<void> {
    const login = auth.login({ email: 'ana@example.com', password: 'clave' });
    const req = mock.expectOne(`${BASE}/clientes/autenticar`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ access_token: 'token', id_token: 'id', token_type: 'Bearer' });
    await login;
  }

  it('envía el token a las operaciones que declaran authorization', async () => {
    await iniciarSesion();
    const operaciones: [string, string][] = [
      ['PUT', '/clientes/cliente/consentimiento'],
      ['GET', '/clientes/cliente/perfil'],
      ['POST', '/clientes/cliente/verificaciones-kyc-aml'],
      ['GET', '/clientes/cliente/verificaciones-kyc-aml/verificacion'],
      ['GET', '/consentimientos'],
      ['POST', '/cotizaciones'],
      ['GET', '/cotizaciones/cotizacion'],
      ['GET', '/cotizaciones/cotizacion/condiciones'],
      ['POST', '/cotizaciones/cotizacion/condiciones/decisiones'],
      ['GET', '/cotizaciones/cotizacion/firma-digital'],
      ['POST', '/cotizaciones/cotizacion/firma-digital'],
      ['GET', '/cotizaciones/cotizacion/poliza'],
      ['GET', '/cotizaciones/cotizacion/resumen-pago'],
      ['GET', '/polizas/mis-polizas'],
      ['GET', '/polizas/poliza'],
      ['GET', '/polizas/poliza/certificado'],
      ['GET', '/polizas/poliza/certificado/descarga'],
      ['POST', '/pagos'],
      ['GET', '/pagos/pago'],
      ['GET', '/auditoria-emision'],
      ['GET', '/socios'],
      ['POST', '/socios'],
      ['POST', '/socios/socio/api-keys'],
      ['GET', '/socios/socio/api-keys'],
      ['GET', '/socios/socio/api-keys/key'],
      ['DELETE', '/socios/socio/api-keys/key'],
    ];
    for (const [metodo, ruta] of operaciones) {
      http.request(metodo, `${BASE}${ruta}`).subscribe();
      const req = mock.expectOne(`${BASE}${ruta}`);
      expect(req.request.headers.get('Authorization'), `${metodo} ${ruta}`).toBe('Bearer token');
      req.flush({});
    }
  });

  it('conserva los parámetros y cabeceras de los servicios', async () => {
    await iniciarSesion();
    const consulta = firstValueFrom(
      TestBed.inject(AuditoriaConsentimientoService).consultar('correo', 'ana@example.com'),
    );
    const req = mock.expectOne((r) => r.url === `${BASE}/consentimientos`);
    expect(req.request.params.get('correo')).toBe('ana@example.com');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({ cliente: {}, eventos: [] });
    await consulta;

    const pago = firstValueFrom(
      TestBed.inject(AdquisicionService).procesarPago(
        { cotizacion_id: 'q', cliente_id: 'c', metodo_pago: 'PAYPAL', paypal_email: 'a@b.co' },
        'clave',
      ),
    );
    const post = mock.expectOne(`${BASE}/pagos`);
    expect(post.request.headers.get('Idempotency-Key')).toBe('clave');
    expect(post.request.headers.get('Authorization')).toBe('Bearer token');
    post.flush({});
    await pago;

    const poliza = firstValueFrom(TestBed.inject(AdquisicionService).poliza('q', 'c'));
    const get = mock.expectOne(`${BASE}/cotizaciones/q/poliza`);
    expect(get.request.headers.get('X-Client-Id')).toBe('c');
    expect(get.request.headers.get('Authorization')).toBe('Bearer token');
    get.flush({});
    await poliza;
  });

  it('no envía credenciales a rutas públicas, externas o no declaradas', async () => {
    await iniciarSesion();
    for (const [metodo, url] of [
      ['GET', `${BASE}/productos`],
      ['GET', `${BASE}/productos/VIAJE`],
      ['POST', `${BASE}/clientes/registro`],
      ['POST', `${BASE}/clientes/autenticar`],
      ['POST', `${BASE}/clientes/recuperar-clave`],
      ['POST', `${BASE}/clientes/recuperar-clave/confirmar`],
      ['GET', `${BASE}/otro`],
      ['POST', `${BASE}-externo/pagos`],
      ['POST', `https://externo.example${BASE}/pagos`],
      ['GET', `${BASE}/cotizaciones/../../externo`],
    ]) {
      http.request(metodo, url).subscribe();
      const req = mock.expectOne(url);
      expect(req.request.headers.has('Authorization'), url).toBe(false);
      req.flush({});
    }
  });

  it('respeta una autorización explícita y omite el token tras cerrar sesión', async () => {
    await iniciarSesion();
    http
      .get(`${BASE}/consentimientos`, {
        headers: new HttpHeaders({ Authorization: 'Bearer otro' }),
      })
      .subscribe();
    const explicita = mock.expectOne(`${BASE}/consentimientos`);
    expect(explicita.request.headers.get('Authorization')).toBe('Bearer otro');
    explicita.flush({});

    auth.logout();
    http.get(`${BASE}/consentimientos`).subscribe();
    const sinSesion = mock.expectOne(`${BASE}/consentimientos`);
    expect(sinSesion.request.headers.has('Authorization')).toBe(false);
    sinSesion.flush({});
  });
});

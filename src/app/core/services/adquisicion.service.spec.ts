import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AdquisicionService } from './adquisicion.service';

describe('AdquisicionService', () => {
  let api: AdquisicionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdquisicionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía la firma PNG como multipart y consulta su estado', async () => {
    const captura = firstValueFrom(
      api.capturarFirma('q', 'cliente', 'producto', new Blob(['png'], { type: 'image/png' })),
    );
    const post = http.expectOne('/api/v1/bff-web/cotizaciones/q/firma-digital');
    expect(post.request.method).toBe('POST');
    expect(post.request.headers.has('Idempotency-Key')).toBe(true);
    const datos = post.request.body as FormData;
    expect(datos.get('cliente_id')).toBe('cliente');
    expect(datos.get('producto_id')).toBe('producto');
    expect((datos.get('firma') as File).type).toBe('image/png');
    post.flush({ estado: 'CAPTURADA' });
    await captura;
    const consulta = firstValueFrom(api.consultarFirma('q'));
    http.expectOne('/api/v1/bff-web/cotizaciones/q/firma-digital').flush({ estado: 'CAPTURADA' });
    expect((await consulta).estado).toBe('CAPTURADA');
  });

  it('usa la clave de idempotencia y las rutas de pago declaradas', async () => {
    const resumen = firstValueFrom(api.resumenPago('q'));
    http.expectOne('/api/v1/bff-web/cotizaciones/q/resumen-pago').flush({ prima_total: '100' });
    await resumen;
    const solicitud = {
      cotizacion_id: 'q',
      cliente_id: 'c',
      metodo_pago: 'PAYPAL' as const,
      paypal_email: 'a@b.co',
    };
    const envio = firstValueFrom(api.procesarPago(solicitud, 'clave'));
    const post = http.expectOne('/api/v1/bff-web/pagos');
    expect(post.request.headers.get('Idempotency-Key')).toBe('clave');
    expect(post.request.body).toEqual(solicitud);
    post.flush({ pago_id: 'p', estado: 'PENDIENTE' });
    await envio;
    const consulta = firstValueFrom(api.consultarPago('p'));
    http.expectOne('/api/v1/bff-web/pagos/p').flush({ estado: 'APROBADO' });
    expect((await consulta).estado).toBe('APROBADO');
  });

  it('envía la identidad del cliente al consultar y descargar el certificado', async () => {
    const peticiones: { url: string; observable: Observable<unknown> }[] = [
      {
        url: '/api/v1/bff-web/cotizaciones/q/poliza',
        observable: api.poliza('q', 'c'),
      },
      {
        url: '/api/v1/bff-web/polizas/p/certificado',
        observable: api.certificado('p', 'c'),
      },
      {
        url: '/api/v1/bff-web/polizas/p/certificado/descarga',
        observable: api.descargarCertificado('p', 'c'),
      },
    ];
    for (const peticion of peticiones) {
      const resultado = firstValueFrom(peticion.observable);
      const req = http.expectOne(peticion.url);
      expect(req.request.headers.get('X-Client-Id')).toBe('c');
      if (peticion.url.endsWith('/descarga')) {
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
      } else {
        req.flush({});
      }
      await resultado;
    }
  });
});

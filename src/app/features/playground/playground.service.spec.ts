import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Peticion } from './playground.models';
import { PlaygroundService } from './playground.service';

describe('PlaygroundService', () => {
  const peticion = (extra: Partial<Peticion> = {}): Peticion => ({
    metodo: 'GET',
    url: 'http://socios.test/api/v1/bff-socios/productos',
    headers: { 'X-API-Key': 'k' },
    binario: false,
    ...extra,
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servicio: TestBed.inject(PlaygroundService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('devuelve código, headers y JSON formateado, incluso en errores HTTP', async () => {
    const { servicio, http } = setup();
    const promesa = servicio.enviar(peticion());
    const req = http.expectOne('http://socios.test/api/v1/bff-socios/productos');
    expect(req.request.headers.get('X-API-Key')).toBe('k');
    req.flush('{"detail":"nope"}', {
      status: 403,
      statusText: 'Forbidden',
      headers: { 'X-Id': '1' },
    });
    const res = await promesa;
    expect(res.estado).toBe(403);
    expect(res.headers['X-Id']).toBe('1');
    expect(res.cuerpo).toEqual({ detail: 'nope' });
    expect(res.contenido).toBe('{\n  "detail": "nope"\n}');
  });

  it('envía multipart con campos y archivos', async () => {
    const { servicio, http } = setup();
    const promesa = servicio.enviar(
      peticion({
        metodo: 'POST',
        formulario: {
          campos: { cotizacion_id: 'q' },
          archivos: [
            { campo: 'firma', nombre: 'f.png', tipo: 'image/png', contenido: new Uint8Array(3) },
          ],
        },
      }),
    );
    const req = http.expectOne((r) => r.method === 'POST');
    const datos = req.request.body as FormData;
    expect(datos.get('cotizacion_id')).toBe('q');
    expect((datos.get('firma') as File).name).toBe('f.png');
    req.flush('{}');
    await promesa;
  });

  it('describe un PDF sin mostrar su contenido', async () => {
    const { servicio, http } = setup();
    const promesa = servicio.enviar(peticion({ binario: true }));
    http
      .expectOne(() => true)
      .flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    expect((await promesa).contenido).toBe('PDF en memoria (8 bytes)');
  });

  it('informa cuando no hay respuesta del servidor', async () => {
    const { servicio, http } = setup();
    const promesa = servicio.enviar(peticion());
    http.expectOne(() => true).error(new ProgressEvent('error'));
    await expect(promesa).rejects.toThrow(/No hubo respuesta/);
  });
});

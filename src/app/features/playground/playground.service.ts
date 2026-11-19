import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Peticion, RespuestaHttp } from './playground.models';

@Injectable({ providedIn: 'root' })
export class PlaygroundService {
  private readonly http = inject(HttpClient);

  /** Nunca rechaza por códigos HTTP de error: devuelve la respuesta para mostrarla tal cual. */
  async enviar(peticion: Peticion): Promise<RespuestaHttp> {
    const inicio = performance.now();
    const body = peticion.formulario ? this.formData(peticion.formulario) : peticion.json;
    const opciones = {
      headers: peticion.headers,
      body,
      observe: 'response' as const,
    };
    try {
      if (peticion.binario) {
        const res = await firstValueFrom(
          this.http.request(peticion.metodo, peticion.url, { ...opciones, responseType: 'blob' }),
        );
        return await this.desdeBlob(res, inicio);
      }
      const res = await firstValueFrom(
        this.http.request(peticion.metodo, peticion.url, { ...opciones, responseType: 'text' }),
      );
      return this.construir(res.status, res.headers, res.body ?? '', inicio);
    } catch (e) {
      if (!(e instanceof HttpErrorResponse)) throw e;
      if (e.status === 0) {
        throw new Error(
          'No hubo respuesta del servidor. Revisa la conexión y la configuración del proxy.',
          { cause: e },
        );
      }
      const cuerpo = e.error instanceof Blob ? await e.error.text() : e.error;
      return this.construir(e.status, e.headers, typeof cuerpo === 'string' ? cuerpo : '', inicio);
    }
  }

  private formData(f: NonNullable<Peticion['formulario']>): FormData {
    const datos = new FormData();
    Object.entries(f.campos).forEach(([k, v]) => datos.append(k, v));
    f.archivos.forEach((a) =>
      datos.append(a.campo, new Blob([a.contenido], { type: a.tipo }), a.nombre),
    );
    return datos;
  }

  private async desdeBlob(res: HttpResponse<Blob>, inicio: number): Promise<RespuestaHttp> {
    const blob = res.body;
    const tipo = (res.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    const respuesta = this.construir(res.status, res.headers, '', inicio);
    if (blob && tipo === 'application/pdf') {
      respuesta.contenido = `PDF en memoria (${blob.size} bytes)`;
    } else if (blob) {
      return this.construir(res.status, res.headers, await blob.text(), inicio);
    }
    return respuesta;
  }

  private construir(
    estado: number,
    cabeceras: { keys(): string[]; get(nombre: string): string | null },
    texto: string,
    inicio: number,
  ): RespuestaHttp {
    let cuerpo: unknown = texto;
    let contenido = texto;
    try {
      cuerpo = JSON.parse(texto);
      contenido = JSON.stringify(cuerpo, null, 2);
    } catch {
      // Se muestra como texto plano.
    }
    return {
      estado,
      headers: Object.fromEntries(cabeceras.keys().map((k) => [k, cabeceras.get(k) ?? ''])),
      cuerpo,
      contenido,
      ms: Math.round(performance.now() - inicio),
    };
  }
}

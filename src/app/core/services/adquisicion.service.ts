import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoCertificado,
  FirmaDigital,
  Pago,
  ResumenPago,
  ResumenPoliza,
  SolicitudPago,
} from '../models/adquisicion';

export interface IntentoPago {
  clave: string;
  pago: Pago | null;
  confirmado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdquisicionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly intentos = new Map<string, IntentoPago>();

  intento(cotizacionId: string): IntentoPago | undefined {
    return this.intentos.get(cotizacionId);
  }

  guardarIntento(cotizacionId: string, intento: IntentoPago): void {
    this.intentos.set(cotizacionId, intento);
  }

  eliminarIntento(cotizacionId: string): void {
    this.intentos.delete(cotizacionId);
  }

  capturarFirma(
    cotizacionId: string,
    clienteId: string,
    productoId: string,
    firma: Blob,
  ): Observable<FirmaDigital> {
    const body = new FormData();
    body.append('cliente_id', clienteId);
    body.append('producto_id', productoId);
    body.append('firma', firma, 'firma.png');
    return this.http
      .post<FirmaDigital>(`${this.baseUrl}/cotizaciones/${cotizacionId}/firma-digital`, body, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      .pipe(timeout(10000));
  }

  consultarFirma(cotizacionId: string): Observable<FirmaDigital> {
    return this.http
      .get<FirmaDigital>(`${this.baseUrl}/cotizaciones/${cotizacionId}/firma-digital`)
      .pipe(timeout(10000));
  }

  resumenPago(cotizacionId: string): Observable<ResumenPago> {
    return this.http
      .get<ResumenPago>(`${this.baseUrl}/cotizaciones/${cotizacionId}/resumen-pago`)
      .pipe(timeout(10000));
  }

  procesarPago(solicitud: SolicitudPago, clave: string): Observable<Pago> {
    return this.http
      .post<Pago>(`${this.baseUrl}/pagos`, solicitud, {
        headers: { 'Idempotency-Key': clave },
      })
      .pipe(timeout(10000));
  }

  consultarPago(pagoId: string): Observable<Pago> {
    return this.http.get<Pago>(`${this.baseUrl}/pagos/${pagoId}`).pipe(timeout(10000));
  }

  poliza(cotizacionId: string, clienteId: string): Observable<ResumenPoliza> {
    return this.http
      .get<ResumenPoliza>(`${this.baseUrl}/cotizaciones/${cotizacionId}/poliza`, {
        headers: this.headers(clienteId),
      })
      .pipe(timeout(10000));
  }

  certificado(polizaId: string, clienteId: string): Observable<EstadoCertificado> {
    return this.http
      .get<EstadoCertificado>(`${this.baseUrl}/polizas/${polizaId}/certificado`, {
        headers: this.headers(clienteId),
      })
      .pipe(timeout(10000));
  }

  descargarCertificado(polizaId: string, clienteId: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/polizas/${polizaId}/certificado/descarga`, {
        headers: this.headers(clienteId),
        responseType: 'blob',
      })
      .pipe(timeout(10000));
  }

  private headers(clienteId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': clienteId });
  }
}

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IniciarVerificacionResponse,
  PerfilCliente,
  VerificacionKycAml,
} from '../models/verificacion-kyc';

@Injectable({ providedIn: 'root' })
export class VerificacionKycService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  obtenerPerfil(clienteId: string): Observable<PerfilCliente> {
    return this.http.get<PerfilCliente>(`${this.baseUrl}/${clienteId}/perfil`);
  }

  iniciar(
    clienteId: string,
    cotizacionId: string,
    documentoFrontal: File,
    documentoReverso: File,
  ): Observable<IniciarVerificacionResponse> {
    const cuerpo = new FormData();
    cuerpo.append('cotizacion_id', cotizacionId);
    cuerpo.append('documento_frontal', documentoFrontal);
    cuerpo.append('documento_reverso', documentoReverso);
    return this.http.post<IniciarVerificacionResponse>(
      `${this.baseUrl}/${clienteId}/verificaciones-kyc-aml`,
      cuerpo,
      { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
    );
  }

  consultar(clienteId: string, verificacionId: string): Observable<VerificacionKycAml> {
    return this.http.get<VerificacionKycAml>(
      `${this.baseUrl}/${clienteId}/verificaciones-kyc-aml/${verificacionId}`,
    );
  }
}

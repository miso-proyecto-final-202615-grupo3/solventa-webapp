import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SolicitarRecuperacionClaveResponse {
  mensaje: string;
}

export interface ConfirmarRecuperacionClaveRequest {
  correo: string;
  codigo: string;
  nueva_clave: string;
}

export interface ConfirmarRecuperacionClaveResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class RecuperacionClaveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes/recuperar-clave`;

  solicitar(correo: string): Observable<SolicitarRecuperacionClaveResponse> {
    return this.http.post<SolicitarRecuperacionClaveResponse>(this.baseUrl, {
      correo: correo.trim(),
    });
  }

  confirmar(
    payload: ConfirmarRecuperacionClaveRequest,
  ): Observable<ConfirmarRecuperacionClaveResponse> {
    return this.http.post<ConfirmarRecuperacionClaveResponse>(`${this.baseUrl}/confirmar`, payload);
  }
}

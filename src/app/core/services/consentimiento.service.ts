import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsentimientoResponse, EstadoConsentimiento } from '../models/consentimiento';

@Injectable({ providedIn: 'root' })
export class ConsentimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  actualizar(clienteId: string, estado: EstadoConsentimiento): Observable<ConsentimientoResponse> {
    return this.http.put<ConsentimientoResponse>(`${this.baseUrl}/${clienteId}/consentimiento`, {
      estado,
    });
  }
}

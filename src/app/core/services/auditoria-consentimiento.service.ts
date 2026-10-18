import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuditoriaConsentimientoResponse,
  CriterioBusqueda,
} from '../models/auditoria-consentimiento';

@Injectable({ providedIn: 'root' })
export class AuditoriaConsentimientoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/consentimientos`;

  /** Solo lectura: busca por número de identidad o por correo. */
  consultar(
    criterio: CriterioBusqueda,
    valor: string,
  ): Observable<AuditoriaConsentimientoResponse> {
    const params = new HttpParams().set(criterio, valor.trim());
    return this.http.get<AuditoriaConsentimientoResponse>(this.url, { params });
  }
}

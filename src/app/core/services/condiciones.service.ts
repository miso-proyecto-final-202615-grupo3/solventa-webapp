import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Condiciones, DecisionCondiciones, DecisionResponse } from '../models/condiciones';

@Injectable({ providedIn: 'root' })
export class CondicionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cotizaciones`;

  obtener(cotizacionId: string): Observable<Condiciones> {
    return this.http.get<Condiciones>(`${this.baseUrl}/${cotizacionId}/condiciones`);
  }

  decidir(
    cotizacionId: string,
    condicionesCotizacionId: string,
    decision: DecisionCondiciones,
  ): Observable<DecisionResponse> {
    return this.http.post<DecisionResponse>(
      `${this.baseUrl}/${cotizacionId}/condiciones/decisiones`,
      {
        condiciones_cotizacion_id: condicionesCotizacionId,
        decision,
      },
    );
  }
}

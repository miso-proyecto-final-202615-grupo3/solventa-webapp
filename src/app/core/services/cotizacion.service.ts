import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CotizarRequest, CotizacionResponse, ProductoCotizacion } from '../models/cotizacion';

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/cotizaciones`;

  obtenerProducto(codigo: string): Observable<ProductoCotizacion> {
    return this.http.get<ProductoCotizacion>(`${environment.apiUrl}/productos/${codigo}`);
  }

  cotizar(payload: CotizarRequest): Observable<CotizacionResponse> {
    return this.http.post<CotizacionResponse>(this.url, payload);
  }
}
